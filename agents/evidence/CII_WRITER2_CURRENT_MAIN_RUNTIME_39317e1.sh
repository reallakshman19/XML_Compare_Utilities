#!/usr/bin/env bash
set -u -o pipefail

# Writer2 exact current-main runtime qualification capsule.
# Evidence-only: does not modify product, benchmark, oracle, tolerance, converter, or workflow source.

REPO_URL="${REPO_URL:-https://github.com/reallaksh19/XML_Compare_Utilities.git}"
BASIS="39317e1ae97d990d7d35261d453ca4cd520e623a"
ROOT_TREE="d86acd2fa48ac7553b2b7f1c41ce1dc720688f00"

REGISTRY="Benchmark/CIICompare/Writer2/CII_WRITER2_BENCHMARKS.json"
REGISTRY_BLOB="d786d1e970666aa528a0e3d0822610f6afcb8364"
SOURCE="Benchmark/CIICompare/BM_CII_SOURCE.CII"
SOURCE_BLOB="e41cd05603b56837cbb6e31b9d4074ef6106fe9b"

W2A_TEST="tests/cii-workspace-writer2-restraint-product-routing.test.js"
W2A_BLOB="9922377ddeda86fc9167d65f33c97095346e79fa"
BM01_TEST="tests/cii-workspace-writer2-benchmark-nodename-create.test.js"
BM01_BLOB="7ba33984f290550f6f40eb91369ce9ceab1b74af"
BM02_TEST="tests/cii-workspace-writer2-benchmark-sif-delete.test.js"
BM02_BLOB="688bc905c877ea63c65ba21624ac647660009eee"
BM03_TEST="tests/cii-workspace-writer2-benchmark-hanger-delete-all.test.js"
BM03_BLOB="93703ac66fec9b663165d95a20afbc654b6e26f4"
BM04_TEST="tests/cii-workspace-writer2-benchmark-restraint-delete.test.js"
BM04_BLOB="54c08bf0b2baf8138a703350d9e2600387693008"

BROWSER_SPEC="tests/browser/cii-writer2-multisource-retained-benchmark.spec.mjs"
BROWSER_SPEC_BLOB="e1ff63cb0220649025d6f07bd0dc9727104dcdcd"
BROWSER_CONFIG="playwright.cii-writer2-retained.config.mjs"
BROWSER_CONFIG_BLOB="e26224f675e40666b80667c77e785e7a17d48161"
BROWSER_SERVER="tests/browser/cii-writer2-static-server.mjs"
BROWSER_SERVER_BLOB="85311618b795781d96925e9855902cab95ef8917"
BROWSER_FIXTURE="tests/browser/cii-writer2-bridge-fixture.html"
BROWSER_FIXTURE_BLOB="28c66a7fd6175c7cc50294cbe79e138dbde090f8"
PACKAGE_JSON="package.json"
PACKAGE_JSON_BLOB="4ed6e40a2e49f4df4df03951300f79dd8b09c0bd"
PACKAGE_LOCK="package-lock.json"
PACKAGE_LOCK_BLOB="8ead32dfbd874ab7b1b3d9938d10af7077b2550e"

S1="Benchmark/S1.CII"
S1_BLOB="73c49165b9d33a8c776ef76f480efec3a90e0c93"
S2="Benchmark/S2.CII"
S2_BLOB="a04622553720cb41a6fc2a4b85d8290eac7a3b0a"
S3="Benchmark/S3.CII"
S3_BLOB="a20b1ab87dd4e854cf2f453f8fd206be4b566b42"
TARGET="Benchmark/T.CII"
TARGET_BLOB="96b4a4b12bf66bcb0264c56e7767a857c4cc11e6"
TEXPECTED="Benchmark/TEXPECTED-PARTIALLLYDONE.CII"
TEXPECTED_BLOB="b7d0913a3827deb184d65c880594ca0667562167"

RUN_ROOT="${RUN_ROOT:-$(mktemp -d "${TMPDIR:-/tmp}/cii-w2-current-main.XXXXXX")}"
CHECKOUT_DIR="${CHECKOUT_DIR:-$RUN_ROOT/checkout}"
EVIDENCE_DIR="${EVIDENCE_DIR:-$RUN_ROOT/evidence}"
mkdir -p "$EVIDENCE_DIR" || exit 20

MANIFEST="$EVIDENCE_DIR/runtime-manifest.txt"
SUMMARY="$EVIDENCE_DIR/runtime-summary.txt"
: >"$MANIFEST"
: >"$SUMMARY"

say() { printf '%s\n' "$*" | tee -a "$SUMMARY"; }
record() { printf '%s\n' "$*" >>"$MANIFEST"; }
fail_env() {
  say "BATCH_CLASSIFICATION=NOT_RUN_ENVIRONMENT"
  say "BLOCKER=$1"
  say "EVIDENCE_DIR=$EVIDENCE_DIR"
  exit 20
}
fail_identity() {
  say "BATCH_CLASSIFICATION=NOT_RUN_IDENTITY_MISMATCH"
  say "BLOCKER=$1"
  say "EVIDENCE_DIR=$EVIDENCE_DIR"
  exit 21
}
assert_eq() {
  local label="$1" actual="$2" expected="$3"
  record "$label.actual=$actual"
  record "$label.expected=$expected"
  [ "$actual" = "$expected" ] || fail_identity "$label mismatch: actual=$actual expected=$expected"
}
check_blob() {
  local path="$1" expected="$2" actual
  [ -f "$path" ] || fail_identity "missing frozen path: $path"
  actual="$(git hash-object "$path" 2>/dev/null)" || fail_identity "cannot hash $path"
  assert_eq "blob.$path" "$actual" "$expected"
}
clean_or_fail() {
  local phase="$1" status
  status="$(git status --porcelain=v1 2>/dev/null)" || fail_env "git status failed at $phase"
  printf '%s\n' "$status" >"$EVIDENCE_DIR/git-status-$phase.txt"
  [ -z "$status" ] || fail_identity "worktree dirty at $phase"
}
run_node_case() {
  local id="$1" path="$2" expected_line="$3" status
  say "RUNNING=$id path=$path"
  node "$path" >"$EVIDENCE_DIR/$id.stdout.txt" 2>"$EVIDENCE_DIR/$id.stderr.txt"
  status=$?
  printf '%s\n' "$status" >"$EVIDENCE_DIR/$id.exit-code.txt"
  record "$id.exit_code=$status"
  if [ "$status" -ne 0 ]; then
    say "STOPPED_AT=$id"
    say "${id}_CLASSIFICATION=NEEDS_HUMAN_CLASSIFICATION"
    say "RULE=environment/module stop before authored assertion => NOT_RUN; first reached authored assertion/product exception => FAIL"
    say "EVIDENCE_DIR=$EVIDENCE_DIR"
    return "$status"
  fi
  if ! grep -Fq "$expected_line" "$EVIDENCE_DIR/$id.stdout.txt"; then
    say "STOPPED_AT=$id"
    say "${id}_CLASSIFICATION=FAIL_EXPECTED_COMPLETION_MARKER_MISSING"
    say "EXPECTED_MARKER=$expected_line"
    say "EVIDENCE_DIR=$EVIDENCE_DIR"
    return 90
  fi
  clean_or_fail "after-$id"
  say "${id}_CANDIDATE=PASS"
  return 0
}

command -v git >/dev/null 2>&1 || fail_env "git executable unavailable"
command -v node >/dev/null 2>&1 || fail_env "node executable unavailable"
command -v npm >/dev/null 2>&1 || fail_env "npm executable unavailable"

record "repo_url=$REPO_URL"
record "basis=$BASIS"
record "root_tree=$ROOT_TREE"
record "run_root=$RUN_ROOT"
record "checkout_dir=$CHECKOUT_DIR"
record "evidence_dir=$EVIDENCE_DIR"
record "git_version=$(git --version 2>&1)"
record "node_version=$(node --version 2>&1)"
record "npm_version=$(npm --version 2>&1)"

git clone "$REPO_URL" "$CHECKOUT_DIR" >"$EVIDENCE_DIR/git-clone.stdout.txt" 2>"$EVIDENCE_DIR/git-clone.stderr.txt"
clone_status=$?
printf '%s\n' "$clone_status" >"$EVIDENCE_DIR/git-clone.exit-code.txt"
[ "$clone_status" -eq 0 ] || fail_env "exact repository clone failed"

cd "$CHECKOUT_DIR" || fail_env "cannot enter checkout"
git checkout --detach "$BASIS" >"$EVIDENCE_DIR/git-checkout.stdout.txt" 2>"$EVIDENCE_DIR/git-checkout.stderr.txt"
checkout_status=$?
printf '%s\n' "$checkout_status" >"$EVIDENCE_DIR/git-checkout.exit-code.txt"
[ "$checkout_status" -eq 0 ] || fail_env "current-main basis checkout failed"

head_actual="$(git rev-parse HEAD 2>/dev/null)" || fail_identity "cannot resolve HEAD"
tree_actual="$(git rev-parse 'HEAD^{tree}' 2>/dev/null)" || fail_identity "cannot resolve root tree"
assert_eq "head" "$head_actual" "$BASIS"
assert_eq "root_tree" "$tree_actual" "$ROOT_TREE"

check_blob "$REGISTRY" "$REGISTRY_BLOB"
check_blob "$SOURCE" "$SOURCE_BLOB"
check_blob "$W2A_TEST" "$W2A_BLOB"
check_blob "$BM01_TEST" "$BM01_BLOB"
check_blob "$BM02_TEST" "$BM02_BLOB"
check_blob "$BM03_TEST" "$BM03_BLOB"
check_blob "$BM04_TEST" "$BM04_BLOB"
check_blob "$BROWSER_SPEC" "$BROWSER_SPEC_BLOB"
check_blob "$BROWSER_CONFIG" "$BROWSER_CONFIG_BLOB"
check_blob "$BROWSER_SERVER" "$BROWSER_SERVER_BLOB"
check_blob "$BROWSER_FIXTURE" "$BROWSER_FIXTURE_BLOB"
check_blob "$PACKAGE_JSON" "$PACKAGE_JSON_BLOB"
check_blob "$PACKAGE_LOCK" "$PACKAGE_LOCK_BLOB"
check_blob "$S1" "$S1_BLOB"
check_blob "$S2" "$S2_BLOB"
check_blob "$S3" "$S3_BLOB"
check_blob "$TARGET" "$TARGET_BLOB"
check_blob "$TEXPECTED" "$TEXPECTED_BLOB"
clean_or_fail "before-runtime"
say "IDENTITY_GATE=PASS"

run_node_case "W2_A" "$W2A_TEST" "Writer2 W2.13 synthetic RESTRAINT product routing qualification passed."
w2a_status=$?
if [ "$w2a_status" -ne 0 ]; then
  say "BM_W2_01_04=NOT_RUN_BLOCKED_ON_W2_A"
  say "S1_S2_S3_RETAINED_BROWSER=NOT_RUN_BLOCKED_ON_W2_A"
  exit "$w2a_status"
fi

run_node_case "BM-W2-01" "$BM01_TEST" "BM-W2-01 retained-real NODENAME CREATE qualification passed."
status=$?
[ "$status" -eq 0 ] || { say "DOWNSTREAM=NOT_RUN"; exit "$status"; }

run_node_case "BM-W2-02" "$BM02_TEST" "CII Writer2 BM-W2-02 retained-real V11 SIF DELETE benchmark passed."
status=$?
[ "$status" -eq 0 ] || { say "DOWNSTREAM=NOT_RUN"; exit "$status"; }

run_node_case "BM-W2-03" "$BM03_TEST" "BM-W2-03 retained-real HANGER DELETE-ALL qualification passed."
status=$?
[ "$status" -eq 0 ] || { say "DOWNSTREAM=NOT_RUN"; exit "$status"; }

run_node_case "BM-W2-04" "$BM04_TEST" "CII Writer2 BM-W2-04 retained-real V11 RESTRAINT benchmark passed."
status=$?
[ "$status" -eq 0 ] || { say "S1_S2_S3_RETAINED_BROWSER=NOT_RUN"; exit "$status"; }

say "PREPARING=S1_S2_S3_RETAINED_BROWSER"
npm ci --ignore-scripts >"$EVIDENCE_DIR/npm-ci.stdout.txt" 2>"$EVIDENCE_DIR/npm-ci.stderr.txt"
npm_ci_status=$?
printf '%s\n' "$npm_ci_status" >"$EVIDENCE_DIR/npm-ci.exit-code.txt"
[ "$npm_ci_status" -eq 0 ] || fail_env "npm ci failed before retained browser gate"
clean_or_fail "after-npm-ci"

npx playwright install chromium >"$EVIDENCE_DIR/playwright-install.stdout.txt" 2>"$EVIDENCE_DIR/playwright-install.stderr.txt"
install_status=$?
printf '%s\n' "$install_status" >"$EVIDENCE_DIR/playwright-install.exit-code.txt"
[ "$install_status" -eq 0 ] || fail_env "Playwright Chromium installation failed"

say "RUNNING=S1_S2_S3_RETAINED_BROWSER config=$BROWSER_CONFIG"
npx playwright test --config="$BROWSER_CONFIG" >"$EVIDENCE_DIR/S1_S2_S3_RETAINED_BROWSER.stdout.txt" 2>"$EVIDENCE_DIR/S1_S2_S3_RETAINED_BROWSER.stderr.txt"
browser_status=$?
printf '%s\n' "$browser_status" >"$EVIDENCE_DIR/S1_S2_S3_RETAINED_BROWSER.exit-code.txt"
record "S1_S2_S3_RETAINED_BROWSER.exit_code=$browser_status"
if [ "$browser_status" -ne 0 ]; then
  say "STOPPED_AT=S1_S2_S3_RETAINED_BROWSER"
  say "S1_S2_S3_RETAINED_BROWSER_CLASSIFICATION=NEEDS_HUMAN_CLASSIFICATION"
  say "RULE=browser/dependency/server stop before authored test => NOT_RUN; reached authored assertion/product exception => FAIL"
  say "EVIDENCE_DIR=$EVIDENCE_DIR"
  exit "$browser_status"
fi

for marker in \
  '"structuralStatus": "READY"' \
  '"exactRawEmissionStatus": "READY"' \
  '"versionBridgeStatus": "PASS"'
do
  if ! grep -Fq "$marker" "$EVIDENCE_DIR/S1_S2_S3_RETAINED_BROWSER.stdout.txt"; then
    say "S1_S2_S3_RETAINED_BROWSER_CLASSIFICATION=FAIL_EXPECTED_COMPLETION_MARKER_MISSING"
    say "EXPECTED_MARKER=$marker"
    say "EVIDENCE_DIR=$EVIDENCE_DIR"
    exit 91
  fi
done
clean_or_fail "after-retained-browser"
say "S1_S2_S3_RETAINED_BROWSER_CANDIDATE=PASS"

say "BATCH_CANDIDATE=PASS_W2_A_BM_W2_01_04_AND_S1_S2_S3_RETAINED_BROWSER"
say "NOTE=Candidate PASS requires evidence review before final gate promotion. No Writer2 authority is widened by this capsule."
say "EVIDENCE_DIR=$EVIDENCE_DIR"
exit 0
