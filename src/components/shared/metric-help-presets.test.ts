import assert from "node:assert/strict";
import test from "node:test";
import { METRIC_HELP_KEYS, metricHelpPreset } from "./metric-help-presets";

test("metric help is complete and English mode contains no Chinese UI copy", () => {
  for (const key of METRIC_HELP_KEYS) {
    const chinese = metricHelpPreset(key, "zh");
    const english = metricHelpPreset(key, "en");
    for (const preset of [chinese, english]) {
      assert.ok(preset.label);
      assert.ok(preset.content.what);
      assert.ok(preset.content.why);
      assert.ok(preset.content.source);
      assert.ok(preset.content.improve);
    }
    assert.match(JSON.stringify(chinese), /[\u3400-\u9fff]/);
    assert.doesNotMatch(JSON.stringify(english), /[\u3400-\u9fff]/);
  }
});
