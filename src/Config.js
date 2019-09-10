const	serverBase = window.serverBase || '//maps.kosmosnimki.ru/',
		serverProxy = serverBase + 'Plugins/ForestReport/proxy',
		scales = [
			{value: 5000, title: '1:5000'},
			{value: 10000, title: '1:10000'},
			{value: 15000, title: '1:15000'},
			{value: 20000, title: '1:20000'},
			{value: 25000, title: '1:25000'},
			{value: 30000, title: '1:30000'},
			{value: 35000, title: '1:35000'},
			{value: 40000, title: '1:40000'},
			{value: 45000, title: '1:45000'},
			{value: 50000, title: '1:50000'},
			{value: '', title: 'Авто'}
		],
		fields = {
			report_t:	{ Name: 'report_t', ColumnSimpleType: 'String', title: 'Тип отчета', save: true, onValue: {
				'ИЛ':	{ show: ['form_rub', 'type_rub'], hide: ['reforest_t'], title: 'об использовании лесов', value: 'ИЛ' },
				'ВЛ':	{ hide: ['form_rub', 'type_rub'], show: ['reforest_t'], title: 'о воспроизводстве лесов', value: 'ВЛ' }
			}},
			company:		{ Name: 'company', ColumnSimpleType: 'String', save: true, title: 'Наименование организации'},
			region:			{ Name: 'region', ColumnSimpleType: 'String', save: true, title: 'Субъект Российской Федерации'},
			forestr:		{ Name: 'forestr', ColumnSimpleType: 'String', save: true, title: 'Лесничество'},
			subforest:		{ Name: 'subforest', ColumnSimpleType: 'String', save: true, title: 'Участковое Лесничество'},
			dacha:			{ Name: 'dacha', ColumnSimpleType: 'String', title: 'Дача'},
			kvartal:		{ Name: 'kvartal', ColumnSimpleType: 'Integer', title: 'Квартал'},
			vydel:			{ Name: 'vydel', ColumnSimpleType: 'String', title: 'Выделы'},
			delyanka:		{ Name: 'delyanka', ColumnSimpleType: 'String', title: 'Делянка'},
			form_rub:		{ Name: 'form_rub', ColumnSimpleType: 'String', save: true, title: 'Форма рубки'},
			type_rub:		{ Name: 'type_rub', ColumnSimpleType: 'String', title: 'Тип рубки'},
			reforest_t:		{ Name: 'reforest_t', ColumnSimpleType: 'String', title: 'Тип лесовосстановления'},
			year:			{ Name: 'year', ColumnSimpleType: 'String', save: true, title: 'Год'},
			area:			{ Name: 'area', ColumnSimpleType: 'String', title: 'Площадь'},
			FRSTAT:			{ Name: 'FRSTAT', ColumnSimpleType: 'Integer', title: 'Признак отчета'},
			snap:			{ Name: 'snap', ColumnSimpleType: 'String', title: 'Привязочный ход'},

			scale:			{value: 10000, title: 'Масштаб'},
			inn:			{value: '', title: 'ИНН'}
		};

const fieldsConf = fields;
const colsToHash = arr => {
	return arr.reduce((a, v, i) => { a[v] = i; return a; }, {});
};

/*jslint plusplus:true */
function Geomag(model) {
	'use strict';
	var wmm,
		maxord = 12,
		a = 6378.137,		// WGS 1984 Equatorial axis (km)
		b = 6356.7523142,	// WGS 1984 Polar axis (km)
		re = 6371.2,
		a2 = a * a,
		b2 = b * b,
		c2 = a2 - b2,
		a4 = a2 * a2,
		b4 = b2 * b2,
		c4 = a4 - b4,
		z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		unnormalizedWMM;

	function parseCof(cof) {
		wmm = (function (cof) {
			var modelLines = cof.split('\n'), wmm = [], i, vals, epoch, model, modelDate;
			for (i in modelLines) {
				if (modelLines.hasOwnProperty(i)) {
					vals = modelLines[i].replace(/^\s+|\s+$/g, "").split(/\s+/);
					if (vals.length === 3) {
						epoch = parseFloat(vals[0]);
						model = vals[1];
						modelDate = vals[2];
					} else if (vals.length === 6) {
						wmm.push({
							n: parseInt(vals[0], 10),
							m: parseInt(vals[1], 10),
							gnm: parseFloat(vals[2]),
							hnm: parseFloat(vals[3]),
							dgnm: parseFloat(vals[4]),
							dhnm: parseFloat(vals[5])
						});
					}
				}
			}

			return {epoch: epoch, model: model, modelDate: modelDate, wmm: wmm};
		}(cof));
	}

	function unnormalize(wmm) {
		var i, j, m, n, D2, flnmj,
			c = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice()],
			cd = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice()],
			k = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice()],
			snorm = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice()],
			model = wmm.wmm;
		for (i in model) {
			if (model.hasOwnProperty(i)) {
				if (model[i].m <= model[i].n) {
					c[model[i].m][model[i].n] = model[i].gnm;
					cd[model[i].m][model[i].n] = model[i].dgnm;
					if (model[i].m !== 0) {
						c[model[i].n][model[i].m - 1] = model[i].hnm;
						cd[model[i].n][model[i].m - 1] = model[i].dhnm;
					}
				}
			}
		}
		/* CONVERT SCHMIDT NORMALIZED GAUSS COEFFICIENTS TO UNNORMALIZED */
		snorm[0][0] = 1;

		for (n = 1; n <= maxord; n++) {
			snorm[0][n] = snorm[0][n - 1] * (2 * n - 1) / n;
			j = 2;

			for (m = 0, D2 = (n - m + 1); D2 > 0; D2--, m++) {
				k[m][n] = (((n - 1) * (n - 1)) - (m * m)) /
					((2 * n - 1) * (2 * n - 3));
				if (m > 0) {
					flnmj = ((n - m + 1) * j) / (n + m);
					snorm[m][n] = snorm[m - 1][n] * Math.sqrt(flnmj);
					j = 1;
					c[n][m - 1] = snorm[m][n] * c[n][m - 1];
					cd[n][m - 1] = snorm[m][n] * cd[n][m - 1];
				}
				c[m][n] = snorm[m][n] * c[m][n];
				cd[m][n] = snorm[m][n] * cd[m][n];
			}
		}
		k[1][1] = 0.0;

		unnormalizedWMM = {epoch: wmm.epoch, k: k, c: c, cd: cd};
	}

	this.setCof = function (cof) {
		parseCof(cof);
		unnormalize(wmm);
	};
	this.getWmm = function () {
		return wmm;
	};
	this.setUnnorm = function (val) {
		unnormalizedWMM = val;
	};
	this.getUnnorm = function () {
		return unnormalizedWMM;
	};
	this.getEpoch = function () {
		return unnormalizedWMM.epoch;
	};
	this.setEllipsoid = function (e) {
		a = e.a;
		b = e.b;
		re = 6371.2;
		a2 = a * a;
		b2 = b * b;
		c2 = a2 - b2;
		a4 = a2 * a2;
		b4 = b2 * b2;
		c4 = a4 - b4;
	};
	this.getEllipsoid = function () {
		return {a: a, b: b};
	};
	this.calculate = function (glat, glon, h, date) {
		if (unnormalizedWMM === undefined) {
			throw new Error("A World Magnetic Model has not been set.")
		}
		if (glat === undefined || glon === undefined) {
			throw new Error("Latitude and longitude are required arguments.");
		}
		function rad2deg(rad) {
			return rad * (180 / Math.PI);
		}
		function deg2rad(deg) {
			return deg * (Math.PI / 180);
		}
		function decimalDate(date) {
			date = date || new Date();
			var year = date.getFullYear(),
				daysInYear = 365 +
					(((year % 400 === 0) || (year % 4 === 0 && (year % 100 > 0))) ? 1 : 0),
				msInYear = daysInYear * 24 * 60 * 60 * 1000;

			return date.getFullYear() + (date.valueOf() - (new Date(year, 0)).valueOf()) / msInYear;
		}

		var epoch = unnormalizedWMM.epoch,
			k = unnormalizedWMM.k,
			c = unnormalizedWMM.c,
			cd = unnormalizedWMM.cd,
			alt = (h / 3280.8399) || 0, // convert h (in feet) to kilometers (default, 0 km)
			dt = decimalDate(date) - epoch,
			rlat = deg2rad(glat),
			rlon = deg2rad(glon),
			srlon = Math.sin(rlon),
			srlat = Math.sin(rlat),
			crlon = Math.cos(rlon),
			crlat = Math.cos(rlat),
			srlat2 = srlat * srlat,
			crlat2 = crlat * crlat,
			q,
			q1,
			q2,
			ct,
			st,
			r2,
			r,
			d,
			ca,
			sa,
			aor,
			ar,
			br = 0.0,
			bt = 0.0,
			bp = 0.0,
			bpp = 0.0,
			par,
			temp1,
			temp2,
			parp,
			D4,
			m,
			n,
			fn = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
			fm = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
			z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			tc = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice()],
			sp = z.slice(),
			cp = z.slice(),
			pp = z.slice(),
			p = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice()],
			dp = [z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice(), z.slice(), z.slice(), z.slice(), z.slice(), z.slice(),
				z.slice()],
			bx,
			by,
			bz,
			bh,
			ti,
			dec,
			dip,
			gv;
		sp[0] = 0.0;
		sp[1] = srlon;
		cp[1] = crlon;
		tc[0][0] = 0;
		cp[0] = 1.0;
		pp[0] = 1.0;
		p[0][0] = 1;

		/* CONVERT FROM GEODETIC COORDS. TO SPHERICAL COORDS. */
		q = Math.sqrt(a2 - c2 * srlat2);
		q1 = alt * q;
		q2 = ((q1 + a2) / (q1 + b2)) * ((q1 + a2) / (q1 + b2));
		ct = srlat / Math.sqrt(q2 * crlat2 + srlat2);
		st = Math.sqrt(1.0 - (ct * ct));
		r2 = (alt * alt) + 2.0 * q1 + (a4 - c4 * srlat2) / (q * q);
		r = Math.sqrt(r2);
		d = Math.sqrt(a2 * crlat2 + b2 * srlat2);
		ca = (alt + d) / r;
		sa = c2 * crlat * srlat / (r * d);

		for (m = 2; m <= maxord; m++) {
			sp[m] = sp[1] * cp[m - 1] + cp[1] * sp[m - 1];
			cp[m] = cp[1] * cp[m - 1] - sp[1] * sp[m - 1];
		}

		aor = re / r;
		ar = aor * aor;

		for (n = 1; n <= maxord; n++) {
			ar = ar * aor;
			for (m = 0, D4 = (n + m + 1); D4 > 0; D4--, m++) {

		/*
				COMPUTE UNNORMALIZED ASSOCIATED LEGENDRE POLYNOMIALS
				AND DERIVATIVES VIA RECURSION RELATIONS
		*/
				if (n === m) {
					p[m][n] = st * p[m - 1][n - 1];
					dp[m][n] = st * dp[m - 1][n - 1] + ct *
						p[m - 1][n - 1];
				} else if (n === 1 && m === 0) {
					p[m][n] = ct * p[m][n - 1];
					dp[m][n] = ct * dp[m][n - 1] - st * p[m][n - 1];
				} else if (n > 1 && n !== m) {
					if (m > n - 2) { p[m][n - 2] = 0; }
					if (m > n - 2) { dp[m][n - 2] = 0.0; }
					p[m][n] = ct * p[m][n - 1] - k[m][n] * p[m][n - 2];
					dp[m][n] = ct * dp[m][n - 1] - st * p[m][n - 1] -
						k[m][n] * dp[m][n - 2];
				}

		/*
				TIME ADJUST THE GAUSS COEFFICIENTS
		*/

				tc[m][n] = c[m][n] + dt * cd[m][n];
				if (m !== 0) {
					tc[n][m - 1] = c[n][m - 1] + dt * cd[n][m - 1];
				}

		/*
				ACCUMULATE TERMS OF THE SPHERICAL HARMONIC EXPANSIONS
		*/
				par = ar * p[m][n];
				if (m === 0) {
					temp1 = tc[m][n] * cp[m];
					temp2 = tc[m][n] * sp[m];
				} else {
					temp1 = tc[m][n] * cp[m] + tc[n][m - 1] * sp[m];
					temp2 = tc[m][n] * sp[m] - tc[n][m - 1] * cp[m];
				}
				bt = bt - ar * temp1 * dp[m][n];
				bp += (fm[m] * temp2 * par);
				br += (fn[n] * temp1 * par);
		/*
					SPECIAL CASE:  NORTH/SOUTH GEOGRAPHIC POLES
		*/
				if (st === 0.0 && m === 1) {
					if (n === 1) {
						pp[n] = pp[n - 1];
					} else {
						pp[n] = ct * pp[n - 1] - k[m][n] * pp[n - 2];
					}
					parp = ar * pp[n];
					bpp += (fm[m] * temp2 * parp);
				}
			}
		}

		bp = (st === 0.0 ? bpp : bp / st);
		/*
			ROTATE MAGNETIC VECTOR COMPONENTS FROM SPHERICAL TO
			GEODETIC COORDINATES
		*/
		bx = -bt * ca - br * sa;
		by = bp;
		bz = bt * sa - br * ca;

		/*
			COMPUTE DECLINATION (DEC), INCLINATION (DIP) AND
			TOTAL INTENSITY (TI)
		*/
		bh = Math.sqrt((bx * bx) + (by * by));
		ti = Math.sqrt((bh * bh) + (bz * bz));
		dec = rad2deg(Math.atan2(by, bx));
		dip = rad2deg(Math.atan2(bz, bh));

		/*
			COMPUTE MAGNETIC GRID VARIATION IF THE CURRENT
			GEODETIC POSITION IS IN THE ARCTIC OR ANTARCTIC
			(I.E. GLAT > +55 DEGREES OR GLAT < -55 DEGREES)
			OTHERWISE, SET MAGNETIC GRID VARIATION TO -999.0
		*/

		if (Math.abs(glat) >= 55.0) {
			if (glat > 0.0 && glon >= 0.0) {
				gv = dec - glon;
			} else if (glat > 0.0 && glon < 0.0) {
				gv = dec + Math.abs(glon);
			} else if (glat < 0.0 && glon >= 0.0) {
				gv = dec + glon;
			} else if (glat < 0.0 && glon < 0.0) {
				gv = dec - Math.abs(glon);
			}
			if (gv > 180.0) {
				gv -= 360.0;
			} else if (gv < -180.0) { gv += 360.0; }
		}

		return {dec: dec, dip: dip, ti: ti, bh: bh, bx: bx, by: by, bz: bz, lat: glat, lon: glon, gv: gv};
	};
	this.calc = this.calculate;
	this.mag = this.calculate;

	if (model !== undefined) { // initialize
		if (typeof model === 'string') { // WMM.COF file
			parseCof(model);
			unnormalize(wmm);
		} else if (typeof model === 'object') { // unnorm obj
			this.setUnnorm(model);
		} else {
			throw new Error("Invalid argument type");
		}
	}
}

var cof = `
    2010.0            WMM-2010        11/20/2009
  1  0  -29496.6       0.0       11.6        0.0
  1  1   -1586.3    4944.4       16.5      -25.9
  2  0   -2396.6       0.0      -12.1        0.0
  2  1    3026.1   -2707.7       -4.4      -22.5
  2  2    1668.6    -576.1        1.9      -11.8
  3  0    1340.1       0.0        0.4        0.0
  3  1   -2326.2    -160.2       -4.1        7.3
  3  2    1231.9     251.9       -2.9       -3.9
  3  3     634.0    -536.6       -7.7       -2.6
  4  0     912.6       0.0       -1.8        0.0
  4  1     808.9     286.4        2.3        1.1
  4  2     166.7    -211.2       -8.7        2.7
  4  3    -357.1     164.3        4.6        3.9
  4  4      89.4    -309.1       -2.1       -0.8
  5  0    -230.9       0.0       -1.0        0.0
  5  1     357.2      44.6        0.6        0.4
  5  2     200.3     188.9       -1.8        1.8
  5  3    -141.1    -118.2       -1.0        1.2
  5  4    -163.0       0.0        0.9        4.0
  5  5      -7.8     100.9        1.0       -0.6
  6  0      72.8       0.0       -0.2        0.0
  6  1      68.6     -20.8       -0.2       -0.2
  6  2      76.0      44.1       -0.1       -2.1
  6  3    -141.4      61.5        2.0       -0.4
  6  4     -22.8     -66.3       -1.7       -0.6
  6  5      13.2       3.1       -0.3        0.5
  6  6     -77.9      55.0        1.7        0.9
  7  0      80.5       0.0        0.1        0.0
  7  1     -75.1     -57.9       -0.1        0.7
  7  2      -4.7     -21.1       -0.6        0.3
  7  3      45.3       6.5        1.3       -0.1
  7  4      13.9      24.9        0.4       -0.1
  7  5      10.4       7.0        0.3       -0.8
  7  6       1.7     -27.7       -0.7       -0.3
  7  7       4.9      -3.3        0.6        0.3
  8  0      24.4       0.0       -0.1        0.0
  8  1       8.1      11.0        0.1       -0.1
  8  2     -14.5     -20.0       -0.6        0.2
  8  3      -5.6      11.9        0.2        0.4
  8  4     -19.3     -17.4       -0.2        0.4
  8  5      11.5      16.7        0.3        0.1
  8  6      10.9       7.0        0.3       -0.1
  8  7     -14.1     -10.8       -0.6        0.4
  8  8      -3.7       1.7        0.2        0.3
  9  0       5.4       0.0       -0.0        0.0
  9  1       9.4     -20.5       -0.1       -0.0
  9  2       3.4      11.5        0.0       -0.2
  9  3      -5.2      12.8        0.3        0.0
  9  4       3.1      -7.2       -0.4       -0.1
  9  5     -12.4      -7.4       -0.3        0.1
  9  6      -0.7       8.0        0.1       -0.0
  9  7       8.4       2.1       -0.1       -0.2
  9  8      -8.5      -6.1       -0.4        0.3
  9  9     -10.1       7.0       -0.2        0.2
 10  0      -2.0       0.0        0.0        0.0
 10  1      -6.3       2.8       -0.0        0.1
 10  2       0.9      -0.1       -0.1       -0.1
 10  3      -1.1       4.7        0.2        0.0
 10  4      -0.2       4.4       -0.0       -0.1
 10  5       2.5      -7.2       -0.1       -0.1
 10  6      -0.3      -1.0       -0.2       -0.0
 10  7       2.2      -3.9        0.0       -0.1
 10  8       3.1      -2.0       -0.1       -0.2
 10  9      -1.0      -2.0       -0.2        0.0
 10 10      -2.8      -8.3       -0.2       -0.1
 11  0       3.0       0.0        0.0        0.0
 11  1      -1.5       0.2        0.0       -0.0
 11  2      -2.1       1.7       -0.0        0.1
 11  3       1.7      -0.6        0.1        0.0
 11  4      -0.5      -1.8       -0.0        0.1
 11  5       0.5       0.9        0.0        0.0
 11  6      -0.8      -0.4       -0.0        0.1
 11  7       0.4      -2.5       -0.0        0.0
 11  8       1.8      -1.3       -0.0       -0.1
 11  9       0.1      -2.1        0.0       -0.1
 11 10       0.7      -1.9       -0.1       -0.0
 11 11       3.8      -1.8       -0.0       -0.1
 12  0      -2.2       0.0       -0.0        0.0
 12  1      -0.2      -0.9        0.0       -0.0
 12  2       0.3       0.3        0.1        0.0
 12  3       1.0       2.1        0.1       -0.0
 12  4      -0.6      -2.5       -0.1        0.0
 12  5       0.9       0.5       -0.0       -0.0
 12  6      -0.1       0.6        0.0        0.1
 12  7       0.5      -0.0        0.0        0.0
 12  8      -0.4       0.1       -0.0        0.0
 12  9      -0.4       0.3        0.0       -0.0
 12 10       0.2      -0.9        0.0       -0.0
 12 11      -0.8      -0.2       -0.1        0.0
 12 12       0.0       0.9        0.1        0.0
999999999999999999999999999999999999999999999999
999999999999999999999999999999999999999999999999
`;
var geoMag = new Geomag(cof).mag;
// var geoMag = newGeomag.mag;

export {
	serverBase,
	serverProxy,
	fields,
	fieldsConf,
	scales,
	colsToHash,
	geoMag
};