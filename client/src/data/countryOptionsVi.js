/**
 * Mã quốc gia ISO 3166-1 alpha-2; tên hiển thị do Intl (locale vi) tạo khi gọi getCountryOptions().
 */
const ISO_3166_1_ALPHA2 =
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UK UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW';

let _cached = null;

export function getCountryOptions() {
    if (_cached) return _cached;
    if (typeof Intl === 'undefined' || !Intl.DisplayNames) {
        _cached = [{ code: 'VN', name: 'Việt Nam' }];
        return _cached;
    }
    const codes = ISO_3166_1_ALPHA2.split(' ');
    const dn = new Intl.DisplayNames(['vi'], { type: 'region' });
    _cached = codes
        .map((code) => {
            try {
                const name = dn.of(code);
                if (name && name !== code) {
                    return { code, name };
                }
            } catch {
                // ignore
            }
            return null;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return _cached;
}
