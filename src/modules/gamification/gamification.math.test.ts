import assert from "node:assert/strict";
import test from "node:test";
import { calculateRepeatAward, rankingScore } from "./gamification.math";
import type { AntiFarmingPolicy, RankingSettings } from "./gamification.types";

const policy: AntiFarmingPolicy = {
  active: true, period: "daily", timezone: "America/Fortaleza",
  multipliers: [1, .5, .25, .1], afterLimitMultiplier: 0,
  maxRewardedCompletions: 4, maxXpPerPeriod: null,
  cooldownSeconds: 0, minimumRepeatXp: 0,
};

test("anti-farming default awards 100%, 50%, 25%, 10% and then zero", () => {
  assert.deepEqual([0,1,2,3,4].map((count) => calculateRepeatAward(80,count,0,policy).xp), [80,40,20,8,0]);
});

test("anti-farming responds to an administrative multiplier change", () => {
  const changed = { ...policy, multipliers: [1,.3,.25,.1] };
  assert.equal(calculateRepeatAward(100,1,0,changed).xp,30);
});

test("ranking uses configured weights", () => {
  const settings: RankingSettings = { active:true,xpWeight:1,victoryWeight:50,completedGameWeight:20,perfectRunWeight:100,streakWeight:15,pageSize:50 };
  const progress = { xp:{total:100},games:{wins:2,completed:3,perfectRuns:1},streak:{current:4} };
  assert.equal(rankingScore(progress,settings),420);
  assert.equal(rankingScore(progress,{...settings,victoryWeight:75}),470);
});
