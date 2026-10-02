import {hojeSP} from './agenda.mjs';
export function diasParaEvento(data,hoje=hojeSP()){
 return Math.round((Date.parse(data+'T12:00:00Z')-Date.parse(hoje+'T12:00:00Z'))/86400000);
}
