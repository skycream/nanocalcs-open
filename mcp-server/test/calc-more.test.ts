// 추가 계산 도구: 손으로 검산한 값, 사이트 logic.ts 직접 호출 결과와의 일치, 오류 입력, source_url
import { describe, it, expect } from 'vitest';
import { relativeDate, businessDays, schengen, dueDate, timeZone } from '../src/calc/dates';
import { compoundInterest, bmiForAge, molarMass, apScore, satScore } from '../src/calc/science';
import { ToolInputError } from '../src/catalog';
import { compound } from '../../shared/tools/compound-interest-calculator/logic';
import { evaluate } from '../../shared/tools/bmi-for-age-percentile/logic';
import { satScore as siteSat } from '../../shared/tools/sat-score-calculator/logic';
import { apScore as siteAp } from '../../shared/tools/ap-score-calculator/logic';

const S = 'https://nanocalcs.com/en';

describe('날짜·시간', () => {
  it('상대 날짜: 2026-10-22(목) 기준 next Tuesday', () => {
    const r = relativeDate({ phrase: 'next Tuesday', ref: '2026-10-22' });
    expect(r.weekday).toBe('Tuesday');
    expect(r.date).toBe('2026-10-27');
    expect(r.source_url).toBe(`${S}/relative-date-resolver/?q=next+Tuesday&ref=2026-10-22&weekend=sat-sun`);
  });
  it('상대 날짜: 말일, 이해 못 하는 문구는 오류', () => {
    expect(relativeDate({ phrase: 'last day of February 2028', ref: '2026-10-22' }).date).toBe('2028-02-29');
    expect(() => relativeDate({ phrase: 'purple monkey', ref: '2026-10-22' })).toThrow(ToolInputError);
  });
  it('영업일: 2026-10-01~10-31 은 22일, 금요일 + 1영업일 = 월요일', () => {
    expect(businessDays({ start: '2026-10-01', end: '2026-10-31' }).business_days).toBe(22);
    expect(businessDays({ start: '2026-10-01', end: '2026-10-31', holidays: ['2026-10-09'] }).business_days).toBe(21);
    const a = businessDays({ start: '2026-10-23', days: 1 });
    expect(a.result).toBe('2026-10-26');
    expect(a.source_url).toBe(`${S}/business-days-calculator/?mode=add&start=2026-10-23&days=1&weekend=sat-sun`);
    expect(() => businessDays({ start: '2026-10-23' })).toThrow(ToolInputError);
  });
  it('셴겐: 45일 + 30일 체류 후 남은 일수', () => {
    const r = schengen({ trips: [{ entry: '2026-01-05', exit: '2026-02-18' }, { entry: '2026-05-01', exit: '2026-05-30' }], on: '2026-06-15' });
    expect(r.days_used).toBe(75);
    expect(r.days_remaining).toBe(15);
    expect(r.overstay).toBe(false);
    expect(r.source_url).toBe(`${S}/schengen-calculator/?trips=2026-01-05_2026-02-18%2C2026-05-01_2026-05-30&date=2026-06-15`);
    expect(() => schengen({ trips: [{ entry: '2026-02-01', exit: '2026-01-01' }] })).toThrow(ToolInputError);
  });
  it('예정일: LMP + 280일, 주기 30일이면 +2일', () => {
    const r = dueDate({ date: '2026-01-01', today: '2026-03-01' });
    expect(r.due_date).toBe('2026-10-08');
    expect(r.gestational_age).toBe('8w 3d');
    expect(dueDate({ date: '2026-01-01', cycle: 30, today: '2026-03-01' }).due_date).toBe('2026-10-10');
    expect(() => dueDate({ date: '2026-01-01', cycle: 60 })).toThrow(ToolInputError);
  });
  it('시간대: 뉴욕 9시(EDT) = 서울 22시, 서머타임 반영', () => {
    const r = timeZone({ date: '2026-07-01', time: '09:00', from: 'America/New_York', to: ['Asia/Seoul', 'UTC'] });
    expect(r.utc).toBe('2026-07-01T13:00:00.000Z');
    expect(r.to[0].local).toBe('2026-07-01 22:00');
    expect(r.from.dst).toBe(true);
    expect(() => timeZone({ date: '2026-07-01', time: '09:00', from: 'Mars/Base', to: ['UTC'] })).toThrow(ToolInputError);
  });
});

describe('금융·건강·과학·시험', () => {
  it('복리: 1만, 5%, 연복리 10년 = 16288.95, 사이트 logic 과 일치', () => {
    const r = compoundInterest({ principal: 10000, rate: 5, years: 10, freq: 'annual' });
    expect(r.final_balance).toBe(16288.95);
    const site = compound({ principal: 10000, ratePct: 5, freq: 'monthly', years: 10, contrib: 200, contribFreq: 'monthly', timing: 'end', inflationPct: 0 });
    const ours = compoundInterest({ principal: 10000, rate: 5, years: 10, deposit: 200 });
    expect(site.ok && ours.final_balance).toBeCloseTo(site.ok ? site.final : NaN, 2);
    expect(ours.source_url).toBe(`${S}/compound-interest-calculator/?amount=10000&rate=5&freq=monthly&years=10&deposit=200&dfreq=monthly&timing=end&infl=0`);
  });
  it('소아 BMI: 10세 여아 140cm 33kg, 사이트 logic 과 일치', () => {
    const r = bmiForAge({ sex: 'girl', age_years: 10, height_cm: 140, weight_kg: 33 });
    const site = evaluate({ ref: 'who', sex: 'girl', months: 120, kg: 33, cm: 140 });
    expect(site.ok).toBe(true);
    if (site.ok) expect(r.percentile).toBeCloseTo(site.pct, 1);
    expect(r.bmi).toBe(16.8);
    expect(r.source_url).toBe(`${S}/bmi-for-age-percentile-calculator/?ref=who&sex=girl&age=10&months=0&units=metric&height=140&weight=33`);
    expect(() => bmiForAge({ sex: 'girl', age_years: 1, height_cm: 80, weight_kg: 10, ref: 'cdc' })).toThrow(ToolInputError);
  });
  it('몰질량: H2O 18.015, CuSO4·5H2O 249.69, 10 g 의 몰수', () => {
    expect(molarMass({ formula: 'H2O' }).molar_mass_g_per_mol).toBeCloseTo(18.015, 2);
    const r = molarMass({ formula: 'CuSO4*5H2O', grams: 10 });
    expect(r.molar_mass_g_per_mol).toBeCloseTo(249.69, 1);
    expect(r.moles!).toBeCloseTo(10 / 249.69, 4);
    expect(r.source_url).toBe(`${S}/molar-mass-calculator/?unit=g&f=CuSO4*5H2O&amt=10`);
    expect(() => molarMass({ formula: 'Xx2' })).toThrow(ToolInputError);
  });
  it('AP: 사이트 logic 과 같은 점수', () => {
    const frq = [5, 5, 5, 5, 5, 5];
    const site = siteAp('calcab', 30, frq);
    const r = apScore({ subject: 'calcab', mcq_correct: 30, frq });
    expect(site.ok && r.predicted_score).toBe(site.ok ? site.value.score : null);
    expect(r.source_url).toBe(`${S}/ap-score-calculator/?subj=calcab&mc=30&f1=5&f2=5&f3=5&f4=5&f5=5&f6=5`);
    expect(() => apScore({ subject: 'calcab', mcq_correct: 30, frq: [5] })).toThrow(ToolInputError);
  });
  it('SAT: 사이트 logic 과 같은 범위, 만점 상단 1600', () => {
    const site = siteSat('4', 17, 17, 17, 17);
    const r = satScore({ test: '4', rw1: 17, rw2: 17, math1: 17, math2: 17 });
    if (site.ok) expect(r.total).toBe(site.value.total.lo === site.value.total.hi ? `${site.value.total.lo}` : `${site.value.total.lo}-${site.value.total.hi}`);
    expect(satScore({ rw1: 33, rw2: 33, math1: 27, math2: 27 }).total).toMatch(/1600$/);
    expect(() => satScore({ rw1: 40, rw2: 0, math1: 0, math2: 0 })).toThrow(ToolInputError);
  });
});
