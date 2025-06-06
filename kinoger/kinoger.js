function searchResults(html) {
    const results = [];
    
    // Use regex to capture movie details
    const filmListRegex = /<div class="titlecontrol">[\s\S]*?<a href="([^"]+)">(.*?)<\/a>[\s\S]*?<div class="content_text searchresult_img">[\s\S]*?<img src="([^"]+)"/g;
    
    let match;
    while ((match = filmListRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const title = match[2].trim();
        const image = match[3].trim();

        results.push({
            title,
            image,
            href,
        });
    }
    
    console.log(results);
    return results;
}

function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<div class="images-border"[^>]*>([\s\S]*?)<br><br>/);
    
    const description = descriptionMatch 
        ? descriptionMatch[1].replace(/<[^>]+>/g, '').trim()  // Remove any HTML tags
        : 'N/A';

    const alias = '';

    const airdate = '';

    details.push({
        description: description,
        alias: alias,
        airdate: airdate
    });

    console.log(details);
    return details;
}

function extractEpisodes(html) {
    const episodes = [];

    // Match all instances of .show() containing video URLs
    const showMatches = html.match(/\.show\(\d+,\s*\[\[(.*?)\]\]/g);

    console.log(showMatches);

    if (showMatches) {
        showMatches.forEach(match => {
            // Extract URLs from within the double brackets [[ ]]
            const urlMatches = match.match(/'([^']+)'/g);
            
            if (urlMatches) {
                for (let i = 0; i < urlMatches.length; i++) {
                    const cleanUrl = urlMatches[i].replace(/'/g, '').trim();
                    if (cleanUrl.startsWith("https://supervideo")) {
                        episodes.push(
                            {
                                href: cleanUrl,
                                number: `${i + 1}`
                            }
                        );
                    }
                }
            }
        });
    }

    console.log("Episodes:", episodes);
    
    return episodes;
}

function extractStreamUrl(html) {
    const scriptMatch = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        console.log("No packed script found");
        return JSON.stringify({ stream: 'N/A' });
    }
   
    const unpackedScript = unpack(scriptMatch[1]);
    
    const streamMatch = unpackedScript.match(/(?<=file:")[^"]+/);
    const stream = streamMatch ? streamMatch[0].trim() : 'N/A';
    
    console.log(stream);
    return stream;
}

class Unbaser {
    constructor(base) {
        /* Functor for a given base. Will efficiently convert
          strings to natural numbers. */
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        // fill elements 37...61, if necessary
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        // If base can be handled by int() builtin, let it do it for us
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            // Build conversion dictionary cache
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        /* Decodes a value to an integer. */
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}

function detect(source) {
    /* Detects whether `source` is P.A.C.K.E.R. coded. */
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
}

function unpack(source) {
    /* Unpacks P.A.C.K.E.R. packed js code. */
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        /* Look up symbols in the synthetic symtab. */
        const word = match;
        let word2;
        if (radix == 1) {
            //throw Error("symtab unknown");
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        /* Juice from a source file the four args needed by decoder. */
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            //const args = re.search(juicer, source, re.DOTALL);
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                    //don't know what it is
                    // a = list(a);
                    // a[1] = 62;
                    // a = tuple(a);
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        /* Strip string lookup table (list) and replace values in source. */
        /* Need to work on this. */
        return source;
    }
}
