/**
 * liturgy.js
 * Computes the Roman Rite liturgical season and major feast days.
 * Falls back to a local lookup if the network is unavailable.
 */

window.LiturgyCalendar = (function () {

  // ── Helpers ──────────────────────────────────────────────────────
  function easter(year) {
    // Anonymous Gregorian algorithm
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
  }

  function firstAdvent(year) {
    // 4th Sunday before Christmas
    const christmas = new Date(year, 11, 25);
    const dow = christmas.getDay(); // 0=Sun
    const offset = dow === 0 ? 28 : 28 - dow;
    return addDays(christmas, -offset);
  }

  // ── Fixed Solemnities & Feasts (MM-DD) ───────────────────────────
  const FIXED = {
    '01-01': { name: 'Solemnity of Mary, Mother of God',          rank: 'Solemnity', color: 'white'  },
    '01-06': { name: 'The Epiphany of the Lord',                   rank: 'Solemnity', color: 'white'  },
    '02-02': { name: 'The Presentation of the Lord (Candlemas)',   rank: 'Feast',     color: 'white'  },
    '02-14': { name: 'St Valentine, Martyr',                       rank: 'Optional Memorial', color: 'red' },
    '03-17': { name: 'St Patrick, Bishop — Patron of Ireland',     rank: 'Solemnity', color: 'white'  },
    '03-19': { name: 'St Joseph, Spouse of the Blessed Virgin',    rank: 'Solemnity', color: 'white'  },
    '03-25': { name: 'The Annunciation of the Lord',               rank: 'Solemnity', color: 'white'  },
    '04-23': { name: 'St George, Martyr',                          rank: 'Optional Memorial', color: 'red' },
    '06-24': { name: 'The Nativity of St John the Baptist',        rank: 'Solemnity', color: 'white'  },
    '06-29': { name: 'Sts Peter and Paul, Apostles',               rank: 'Solemnity', color: 'red'    },
    '07-03': { name: 'St Thomas, Apostle',                         rank: 'Feast',     color: 'red'    },
    '07-22': { name: 'St Mary Magdalene',                          rank: 'Feast',     color: 'white'  },
    '07-25': { name: 'St James, Apostle',                          rank: 'Feast',     color: 'red'    },
    '08-06': { name: 'The Transfiguration of the Lord',            rank: 'Feast',     color: 'white'  },
    '08-15': { name: 'The Assumption of the Blessed Virgin Mary',  rank: 'Solemnity', color: 'white'  },
    '08-22': { name: 'The Queenship of the Blessed Virgin Mary',   rank: 'Memorial',  color: 'white'  },
    '09-08': { name: 'The Nativity of the Blessed Virgin Mary',    rank: 'Feast',     color: 'white'  },
    '09-14': { name: 'The Exaltation of the Holy Cross',           rank: 'Feast',     color: 'red'    },
    '09-15': { name: 'Our Lady of Sorrows',                        rank: 'Memorial',  color: 'white'  },
    '10-07': { name: 'Our Lady of the Rosary',                     rank: 'Memorial',  color: 'white'  },
    '11-01': { name: 'All Saints',                                  rank: 'Solemnity', color: 'white'  },
    '11-02': { name: 'The Commemoration of All the Faithful Departed (All Souls)', rank: 'Special', color: 'purple' },
    '11-21': { name: 'The Presentation of the Blessed Virgin Mary',rank: 'Memorial',  color: 'white'  },
    '12-08': { name: 'The Immaculate Conception of the Blessed Virgin Mary', rank: 'Solemnity', color: 'white' },
    '12-12': { name: 'Our Lady of Guadalupe',                      rank: 'Feast',     color: 'white'  },
    '12-25': { name: 'The Nativity of the Lord (Christmas)',       rank: 'Solemnity', color: 'white'  },
    '12-26': { name: 'St Stephen, First Martyr',                   rank: 'Feast',     color: 'red'    },
    '12-27': { name: 'St John, Apostle and Evangelist',            rank: 'Feast',     color: 'white'  },
    '12-28': { name: 'The Holy Innocents, Martyrs',                rank: 'Feast',     color: 'red'    },
  };

  // ── Season Calculation ──────────────────────────────────────────
  function getSeason(today) {
    const year = today.getFullYear();
    const easterDate = easter(year);

    // Moveable feasts
    const ashWed     = addDays(easterDate, -46);
    const palmSunday = addDays(easterDate, -7);
    const holyThurs  = addDays(easterDate, -3);
    const goodFriday = addDays(easterDate, -2);
    const holySat    = addDays(easterDate, -1);
    const pentecost  = addDays(easterDate, 49);
    const trinity    = addDays(easterDate, 56);
    const corpusChristi = addDays(easterDate, 60);
    const christKing = addDays(pentecost, 175); // approx — last Sunday before Advent
    const advent1    = firstAdvent(year);
    const christmas  = new Date(year, 11, 25);
    // Epiphany falls on Jan 6 of the CURRENT year (for post-Christmas Jan dates)
    // and also Jan 6 of year+1 (for Dec dates after Christmas)
    const epiphanyCurrentYear = new Date(year, 0, 6);
    const christmasPrevYear   = new Date(year - 1, 11, 25);

    // ── Check moveable feasts first ──
    if (sameDay(today, easterDate)) return { season: 'easter',   feast: 'Easter Sunday — The Resurrection of the Lord', rank: 'Solemnity', color: 'white' };
    if (sameDay(today, goodFriday)) return { season: 'lent',     feast: 'Good Friday — The Passion of the Lord',        rank: 'Special',   color: 'red'   };
    if (sameDay(today, holyThurs))  return { season: 'lent',     feast: 'Holy Thursday — The Lord\'s Supper',           rank: 'Special',   color: 'white' };
    if (sameDay(today, holySat))    return { season: 'lent',     feast: 'Holy Saturday',                                rank: 'Special',   color: 'purple' };
    if (sameDay(today, palmSunday)) return { season: 'lent',     feast: 'Palm Sunday of the Passion of the Lord',       rank: 'Solemnity', color: 'red'   };
    if (sameDay(today, ashWed))     return { season: 'lent',     feast: 'Ash Wednesday',                                rank: 'Special',   color: 'purple' };
    if (sameDay(today, pentecost))  return { season: 'ordinary', feast: 'Pentecost Sunday',                             rank: 'Solemnity', color: 'red'   };
    if (sameDay(today, trinity))    return { season: 'ordinary', feast: 'The Most Holy Trinity',                        rank: 'Solemnity', color: 'white' };
    if (sameDay(today, corpusChristi)) return { season: 'ordinary', feast: 'The Most Holy Body and Blood of Christ (Corpus Christi)', rank: 'Solemnity', color: 'white' };

    // ── Season ranges ──
    if (today >= advent1 && today < christmas) return { season: 'advent',   feast: null, rank: null, color: 'purple' };
    // Christmas season: Dec 25 to Jan 6 — check both post-Dec-25 this year AND pre-Jan-6 this year (from previous Dec 25)
    if (today >= christmas) return { season: 'christmas', feast: null, rank: null, color: 'white' };
    if (today < epiphanyCurrentYear && today >= christmasPrevYear) return { season: 'christmas', feast: null, rank: null, color: 'white' };
    if (today >= ashWed && today < easterDate)  return { season: 'lent',     feast: null, rank: null, color: 'purple' };
    if (today >= easterDate && today < pentecost) return { season: 'easter', feast: null, rank: null, color: 'white' };

    // Ordinary time
    return { season: 'ordinary', feast: null, rank: null, color: 'green' };
  }

  const SEASON_NAMES = {
    ordinary:  'Ordinary Time',
    advent:    'Advent',
    christmas: 'Christmastide',
    lent:      'Lent',
    easter:    'Eastertide',
  };

  // ── Public API ───────────────────────────────────────────────────
  function getToday() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const key = `${mm}-${dd}`;

    const seasonData = getSeason(today);
    const fixed      = FIXED[key];

    let feast, rank, color;

    if (seasonData.feast) {
      // Moveable solemnity overrides fixed
      feast = seasonData.feast;
      rank  = seasonData.rank;
      color = seasonData.color;
    } else if (fixed) {
      feast = fixed.name;
      rank  = fixed.rank;
      color = fixed.color;
    } else {
      feast = 'Feria — ' + SEASON_NAMES[seasonData.season];
      rank  = 'Ferial';
      color = seasonData.color;
    }

    return {
      date:       today,
      season:     seasonData.season,
      seasonName: SEASON_NAMES[seasonData.season],
      feast,
      rank,
      color,
    };
  }

  return { getToday };
})();
