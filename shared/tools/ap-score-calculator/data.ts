// AP 과목별 시험 구성과 등급 추정 기준
// - 섹션 비중: College Board 과목별 AP Central 시험 안내(Course and Exam Description 요약)
// - FRQ 배점: 최근 공개 채점 가이드(Scoring Guidelines)
// - 등급 커트: College Board 가 공개한 연습시험(Public Practice Exam)의 AP Score Conversion Chart.
//   공개 차트의 합성점수 구간을 최대 합성점수 대비 비율로 바꿔, 현재 시험 형식의 가중 합성점수에 적용한다.
//   공개 차트가 없는 과목은 cut 대신 est(2차 자료 추정)를 둔다: 커트를 공개한 2차 자료 두 곳을 합성 비율(%)로
//   맞춰 대조하고, 등급마다 높은 쪽(보수적)을 판정에 쓰며 낮은 쪽과 함께 범위로 보여 준다.
export const LAST_UPDATED = '2026-10-21';

export interface FrqPart { key: string; max: number; weight: number }
export interface CutSource {
  year: number;
  /** 공개 차트의 최대 합성점수 */
  max: number;
  /** 5, 4, 3, 2 점의 합성점수 하한 */
  cuts: [number, number, number, number];
  url: string;
  /** 공개 차트 연도의 시험 형식이 현재와 같은지 */
  sameFormat: boolean;
}
export interface Subject {
  id: string;
  name: string;
  mcq: { n: number; weight: number };
  frq: FrqPart[];
  examUrl: string;
  cut: CutSource | null;
  est?: SecondaryEstimate;
}

export interface SecondarySource { name: string; url: string; cuts: [number, number, number, number] }
/** 2차 자료 추정: 두 출처의 5·4·3·2 커트(합성 비율 %, 0~100). 판정은 등급별 높은 값 */
export interface SecondaryEstimate { checked: string; sources: [SecondarySource, SecondarySource] }

const PPE = 'https://secure-media.collegeboard.org/digitalServices/pdf/ap/';
const FIVE = (slug: string) => `https://fiveable.me/${slug}/ap-score-calculator`;
const GRAD = (path: string) => `https://www.gradgpt.com/ap/${path}`;
const est = (a: SecondarySource, b: SecondarySource): SecondaryEstimate => ({ checked: '2026-10-21', sources: [a, b] });
const src = (name: string, url: string, cuts: [number, number, number, number]): SecondarySource => ({ name, url, cuts });
const exam = (slug: string) => `https://apcentral.collegeboard.org/courses/${slug}/exam`;

// 섹션 안에서 문항 배점 비례로 비중을 나눈다
const byPoints = (section: number, parts: [string, number][]): FrqPart[] => {
  const total = parts.reduce((s, [, m]) => s + m, 0);
  return parts.map(([key, max]) => ({ key, max, weight: (section * max) / total }));
};
const essays = (n: number, max: number, section: number, prefix: string): FrqPart[] =>
  Array.from({ length: n }, (_, i) => ({ key: `${prefix}${i + 1}`, max, weight: section / n }));

export const SUBJECTS: Subject[] = [
  {
    id: 'apush', name: 'AP U.S. History', mcq: { n: 55, weight: 0.4 },
    frq: [...essays(3, 3, 0.2, 'saq'), { key: 'dbq', max: 7, weight: 0.25 }, { key: 'leq', max: 6, weight: 0.15 }],
    examUrl: exam('ap-united-states-history'), cut: null,
    est: est(src('Fiveable', FIVE('apush'), [75, 62, 49, 34]), src('GradGPT', GRAD('calculator/apush'), [78, 59, 48, 35])),
  },
  {
    id: 'world', name: 'AP World History: Modern', mcq: { n: 55, weight: 0.4 },
    frq: [...essays(3, 3, 0.2, 'saq'), { key: 'dbq', max: 7, weight: 0.25 }, { key: 'leq', max: 6, weight: 0.15 }],
    examUrl: exam('ap-world-history-modern'),
    cut: { year: 2013, max: 120, cuts: [78, 64, 48, 32], url: `${PPE}ap-world-history-practice-exam-2013.pdf`, sameFormat: false },
  },
  {
    id: 'lang', name: 'AP English Language and Composition', mcq: { n: 45, weight: 0.45 },
    frq: [{ key: 'synthesis', max: 6, weight: 0.55 / 3 }, { key: 'rhetorical', max: 6, weight: 0.55 / 3 }, { key: 'argument', max: 6, weight: 0.55 / 3 }],
    examUrl: exam('ap-english-language-and-composition'), cut: null,
    est: est(src('Fiveable', FIVE('ap-lang'), [75, 66, 54, 37]), src('GradGPT', GRAD('ap-lang-score-calculator'), [80, 69, 58, 50])),
  },
  {
    id: 'lit', name: 'AP English Literature and Composition', mcq: { n: 55, weight: 0.45 },
    frq: [{ key: 'poetry', max: 6, weight: 0.55 / 3 }, { key: 'prose', max: 6, weight: 0.55 / 3 }, { key: 'literary', max: 6, weight: 0.55 / 3 }],
    examUrl: exam('ap-english-literature-and-composition'), cut: null,
    est: est(src('Fiveable', FIVE('ap-lit'), [74, 66, 54, 37]), src('GradGPT', GRAD('calculator/ap-english-literature'), [80, 69, 58, 49])),
  },
  {
    id: 'bio', name: 'AP Biology', mcq: { n: 60, weight: 0.5 },
    frq: byPoints(0.5, [['long1', 9], ['long2', 9], ['short1', 4], ['short2', 4], ['short3', 4], ['short4', 4]]),
    examUrl: exam('ap-biology'),
    cut: { year: 2013, max: 120, cuts: [93, 75, 54, 30], url: `${PPE}ap-biology-practice-exam-2013.pdf`, sameFormat: false },
  },
  {
    id: 'chem', name: 'AP Chemistry', mcq: { n: 60, weight: 0.5 },
    frq: byPoints(0.5, [['long1', 10], ['long2', 10], ['long3', 10], ['short1', 4], ['short2', 4], ['short3', 4], ['short4', 4]]),
    examUrl: exam('ap-chemistry'), cut: null,
    est: est(src('Fiveable', FIVE('ap-chem'), [70, 58, 42, 31]), src('GradGPT', GRAD('calculator/ap-chemistry'), [73, 58, 42, 28])),
  },
  {
    id: 'calcab', name: 'AP Calculus AB', mcq: { n: 45, weight: 0.5 },
    frq: essays(6, 9, 0.5, 'q'),
    examUrl: exam('ap-calculus-ab'),
    cut: { year: 2012, max: 108, cuts: [67, 54, 41, 33], url: `${PPE}ap-calculus-ab-practice-exam-2012.pdf`, sameFormat: true },
  },
  {
    id: 'calcbc', name: 'AP Calculus BC', mcq: { n: 45, weight: 0.5 },
    frq: essays(6, 9, 0.5, 'q'),
    examUrl: exam('ap-calculus-bc'), cut: null,
    est: est(src('Test Ninjas', 'https://test-ninjas.com/ap-calculus-bc-score-calculator', [63, 51.9, 38.9, 32.4]), src('RemNote', 'https://www.remnote.com/score-calculator/ap-calculus-bc', [62, 49, 37, 26])),
  },
  {
    // 문항 1~5 가 37.5%, 6번(탐구 과제)이 12.5%
    id: 'stats', name: 'AP Statistics', mcq: { n: 40, weight: 0.5 },
    frq: [...essays(5, 4, 0.375, 'q'), { key: 'q6', max: 4, weight: 0.125 }],
    examUrl: exam('ap-statistics'),
    cut: { year: 2012, max: 100, cuts: [70, 57, 44, 33], url: `${PPE}ap-statistics-practice-exam-2012.pdf`, sameFormat: true },
  },
  {
    // 2025 개편: 객관식 75문항 66.7%, AAQ·EBQ 각 7점 33.3%
    id: 'psych', name: 'AP Psychology', mcq: { n: 75, weight: 2 / 3 },
    frq: [{ key: 'aaq', max: 7, weight: 1 / 6 }, { key: 'ebq', max: 7, weight: 1 / 6 }],
    examUrl: exam('ap-psychology'),
    cut: { year: 2012, max: 150, cuts: [112, 94, 79, 65], url: `${PPE}ap-psychology-practice-exam-2012.pdf`, sameFormat: false },
  },
  {
    // FRQ 4문항은 각각 시험의 12.5%
    id: 'gov', name: 'AP U.S. Government and Politics', mcq: { n: 55, weight: 0.5 },
    frq: [{ key: 'concept', max: 3, weight: 0.125 }, { key: 'quant', max: 4, weight: 0.125 }, { key: 'scotus', max: 4, weight: 0.125 }, { key: 'arg', max: 6, weight: 0.125 }],
    examUrl: exam('ap-united-states-government-and-politics'), cut: null,
    est: est(src('Fiveable', FIVE('ap-gov'), [80, 69, 56, 36]), src('GradGPT', GRAD('calculator/ap-us-government'), [71, 57, 45, 30])),
  },
  {
    // 2025 개편: 객관식 42문항 50%, FRQ 4문항(10·12·10·8점) 50%
    id: 'phys1', name: 'AP Physics 1: Algebra-Based', mcq: { n: 42, weight: 0.5 },
    frq: byPoints(0.5, [['mr', 10], ['tbr', 12], ['lab', 10], ['qqt', 8]]),
    examUrl: exam('ap-physics-1'), cut: null,
    est: est(src('Fiveable', FIVE('ap-physics-1'), [70, 54, 40, 25]), src('GradGPT', GRAD('calculator/ap-physics-1'), [74, 56, 42, 31])),
  },
];

export const SUBJECT_IDS = SUBJECTS.map((s) => s.id);
export const MAX_FRQ = Math.max(...SUBJECTS.map((s) => s.frq.length));
export const subjectOf = (id: string): Subject | undefined => SUBJECTS.find((s) => s.id === id);
