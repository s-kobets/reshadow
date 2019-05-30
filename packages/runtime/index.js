import {set, create, __css__, KEYS} from '@reshadow/core';
import stringHash from 'string-hash';
import defaultParse from './parse';
import obj2css from './obj2css';

const createCSS = ({parse = defaultParse} = {}) => {
    const cache = {};

    function css() {
        const str = arguments[0];
        const hash = stringHash(str.join('')).toString(36);
        let mixinsHash = '';
        let parsed;

        const vars = {};
        const mixins = {};

        for (let i = 1, len = arguments.length; i < len; i++) {
            const value = arguments[i];
            if (!value) {
                mixins[i] = '';
            } else if (typeof value === 'object') {
                if (KEYS.__style__ in value) {
                    Object.assign(vars, value[KEYS.__style__]);
                    mixinsHash += '_' + value[KEYS.__hash__];
                    mixins[i] = value[KEYS.__css__];
                } else {
                    const result = css([obj2css(value)]);
                    Object.assign(vars, result[KEYS.__style__]);
                    mixinsHash += '_' + result[KEYS.__hash__];
                    mixins[i] = result[KEYS.__css__];
                }
            } else {
                const name = '--' + hash + '_' + i;
                vars[name] = value;
            }
        }

        const cacheKey = stringHash(hash + mixinsHash).toString(36);

        if (cache[cacheKey]) {
            parsed = cache[cacheKey];
        } else {
            const keys = Object.keys(vars);
            let pointer = 0;

            const values = [];
            for (let i = 1; i < arguments.length; i++) {
                if (i in mixins) {
                    values.push(mixins[i]);
                } else {
                    values.push('var(' + keys[pointer] + ')');
                    pointer++;
                }
            }

            let code = String.raw({raw: str}, ...values);
            let keyframe = true;
            let prefix = true;

            if (/^[\r\n\s]*\w+:/.test(code)) {
                code = '& {' + code + '}';
                keyframe = false;
                prefix = false;
            }

            parsed = parse(code, cacheKey, {keyframe, prefix});

            if (parsed.css[0] === '{') {
                parsed.css =
                    '&' +
                    parsed.css
                        .replace(new RegExp(`\\.___${cacheKey}`, 'g'), '&')
                        .replace(/\}\{/g, '}&{');
            } else {
                __css__(parsed.css, cacheKey);
            }

            parsed.tokens[KEYS.__hash__] = cacheKey;
            parsed.tokens[KEYS.__css__] = parsed.css;

            cache[cacheKey] = parsed;
        }

        const tokens = Object.create(cache[cacheKey].tokens);

        tokens[KEYS.__style__] = vars;
        return tokens;
    }

    return css;
};

const defaultCSS = createCSS();

/**
 * The basic strings check is enough at this purpose,
 * there is no .raw check and so on
 */
const isTemplateLiteral = strs => Array.isArray(strs);

function createStyled(styled, processCSS = defaultCSS) {
    let styles = null;

    function taggedStyled() {
        const strs = arguments[0];
        if (!isTemplateLiteral(strs)) {
            return styled.apply(null, arguments);
        }

        const tokens = processCSS.apply(null, arguments);

        if (styles) {
            styled();
        }

        set([styles, tokens]);

        return styled;
    }

    function carriedStyled() {
        const strs = arguments[0];
        styles = null;
        if (!isTemplateLiteral(strs)) {
            styles = create(Array.prototype.slice.call(arguments));
            set([styles]);
            return taggedStyled;
        }

        return taggedStyled.apply(null, arguments);
    }

    return carriedStyled;
}

export {createStyled, createCSS, defaultCSS as css};