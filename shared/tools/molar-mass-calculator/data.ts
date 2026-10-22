// 원자량 표 (g/mol)
// 출처: IUPAC CIAAW 표준 원자량 (Standard Atomic Weights 2021, Pure Appl. Chem. 94(5) 573, 2022,
//       https://doi.org/10.1515/pac-2019-0603) 과 2023·2024 개정분 (Gd, Lu, Zr), https://www.ciaaw.org/atomic-weights.htm
// - 단일값 원소: CIAAW 표준 원자량 그대로
// - 범위값(interval) 원소 H, Li, B, C, N, O, Mg, Si, S, Cl, Ar, Br, Tl, Pb: IUPAC 관례값(conventional value, abridged)
// - 안정 동위원소가 없는 원소: 가장 오래 사는 동위원소의 질량수 (stable: false)
// 대조(2026-10-21): 118개 전부를 PubChem 주기율표 CSV(https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/CSV)와
//   그 표의 자릿수로 반올림해 프로그램으로 비교했다. 안정 원소 중 다른 값은 Li·S·Ar·Tl·Yb 다섯 개였고,
//   CIAAW Abridged Standard Atomic Weights 2024(https://www.ciaaw.org/abridged-atomic-weights.htm)로 다시 확인해
//   Li 6.94, S 32.06, Ar 39.95, Tl 204.38 은 CIAAW 값이 맞아 그대로 두었다(PubChem 쪽이 다른 반올림·옛 값).
//   Yb 173.045 는 CIAAW 표준 원자량(약식 173.05)이다. 방사성 원소는 PubChem 이 동위원소 질량을 쓰므로 질량수만 비교했고,
//   Lr 은 가장 오래 사는 동위원소가 266Lr 이라 262 → 266 으로 고쳤다.
export interface Element { sym: string; z: number; w: number; stable?: false }

const RAW: [string, number, boolean?][] = [
  ['H', 1.008], ['He', 4.002602], ['Li', 6.94], ['Be', 9.0121831], ['B', 10.81], ['C', 12.011], ['N', 14.007], ['O', 15.999],
  ['F', 18.998403162], ['Ne', 20.1797], ['Na', 22.98976928], ['Mg', 24.305], ['Al', 26.9815384], ['Si', 28.085], ['P', 30.973761998],
  ['S', 32.06], ['Cl', 35.45], ['Ar', 39.95], ['K', 39.0983], ['Ca', 40.078], ['Sc', 44.955907], ['Ti', 47.867], ['V', 50.9415],
  ['Cr', 51.9961], ['Mn', 54.938043], ['Fe', 55.845], ['Co', 58.933194], ['Ni', 58.6934], ['Cu', 63.546], ['Zn', 65.38],
  ['Ga', 69.723], ['Ge', 72.63], ['As', 74.921595], ['Se', 78.971], ['Br', 79.904], ['Kr', 83.798], ['Rb', 85.4678], ['Sr', 87.62],
  ['Y', 88.905838], ['Zr', 91.222], ['Nb', 92.90637], ['Mo', 95.95], ['Tc', 97, false], ['Ru', 101.07], ['Rh', 102.90549],
  ['Pd', 106.42], ['Ag', 107.8682], ['Cd', 112.414], ['In', 114.818], ['Sn', 118.71], ['Sb', 121.76], ['Te', 127.6],
  ['I', 126.90447], ['Xe', 131.293], ['Cs', 132.90545196], ['Ba', 137.327], ['La', 138.90547], ['Ce', 140.116], ['Pr', 140.90766],
  ['Nd', 144.242], ['Pm', 145, false], ['Sm', 150.36], ['Eu', 151.964], ['Gd', 157.249], ['Tb', 158.925354], ['Dy', 162.5],
  ['Ho', 164.930329], ['Er', 167.259], ['Tm', 168.934219], ['Yb', 173.045], ['Lu', 174.96669], ['Hf', 178.486], ['Ta', 180.94788],
  ['W', 183.84], ['Re', 186.207], ['Os', 190.23], ['Ir', 192.217], ['Pt', 195.084], ['Au', 196.96657], ['Hg', 200.592],
  ['Tl', 204.38], ['Pb', 207.2], ['Bi', 208.9804], ['Po', 209, false], ['At', 210, false], ['Rn', 222, false], ['Fr', 223, false],
  ['Ra', 226, false], ['Ac', 227, false], ['Th', 232.0377], ['Pa', 231.03588], ['U', 238.02891], ['Np', 237, false], ['Pu', 244, false],
  ['Am', 243, false], ['Cm', 247, false], ['Bk', 247, false], ['Cf', 251, false], ['Es', 252, false], ['Fm', 257, false],
  ['Md', 258, false], ['No', 259, false], ['Lr', 266, false], ['Rf', 267, false], ['Db', 268, false], ['Sg', 269, false],
  ['Bh', 270, false], ['Hs', 269, false], ['Mt', 278, false], ['Ds', 281, false], ['Rg', 282, false], ['Cn', 285, false],
  ['Nh', 286, false], ['Fl', 289, false], ['Mc', 290, false], ['Lv', 293, false], ['Ts', 294, false], ['Og', 294, false],
];

export const ELEMENTS: Record<string, Element> = Object.fromEntries(
  RAW.map(([sym, w, st], i) => [sym, st === false ? { sym, z: i + 1, w, stable: false } : { sym, z: i + 1, w }]),
);
