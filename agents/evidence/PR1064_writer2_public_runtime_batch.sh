#!/usr/bin/env bash
set -u -o pipefail

# PR1064 Writer2 public-runtime batch capsule.
# Fail-closed: no product/test/benchmark/oracle/workflow source is modified.

REPO_URL="${REPO_URL:-https://github.com/reallaksh19/XML_Compare_Utilities.git}"
BASIS="a9018c131be736606e44fd0379545d233238f33e"
ROOT_TREE="27eb6c81b8b69742e781720b2450714df7c7f74e"
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

RUN_ROOT="${RUN_ROOT:-$(mktemp -d "${TMPDIR:-/tmp}/cii-w2-public-runtime.XXXXXX")}"
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
run_case() {
  local id="$1" path="$2" expected_line="${3:-}" status
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
  if [ -n "$expected_line" ] && ! grep -Fq "$expected_line" "$EVIDENCE_DIR/$id.stdout.txt"; then
    say "STOPPED_AT=$id"
    say "${id}_CLASSIFICATION=FAIL_EXPECTED_COMPLETION_MARKER_MISSING"
    say "EVIDENCE_DIR=$EVIDENCE_DIR"
    return 90
  fi
  clean_or_fail "after-$id"
  say "${id}_CANDIDATE=PASS"
  return 0
}

command -v git >/dev/null 2>&1 || fail_env "git executable unavailable"
command -v node >/dev/null 2>&1 || fail_env "node executable unavailable"

record "repo_url=$REPO_URL"
record "run_root=$RUN_ROOT"
record "checkout_dir=$CHECKOUT_DIR"
record "evidence_dir=$EVIDENCE_DIR"
record "git_version=$(git --version 2>&1)"
record "node_version=$(node --version 2>&1)"

git clone "$REPO_URL" "$CHECKOUT_DIR" >"$EVIDENCE_DIR/git-clone.stdout.txt" 2>"$EVIDENCE_DIR/git-clone.stderr.txt"
clone_status=$?
printf '%s\n' "$clone_status" >"$EVIDENCE_DIR/git-clone.exit-code.txt"
[ "$clone_status" -eq 0 ] || fail_env "exact repository clone failed"

cd "$CHECKOUT_DIR" || fail_env "cannot enter checkout"
git checkout --detach "$BASIS" >"$EVIDENCE_DIR/git-checkout.stdout.txt" 2>"$EVIDENCE_DIR/git-checkout.stderr.txt"
checkout_status=$?
printf '%s\n' "$checkout_status" >"$EVIDENCE_DIR/git-checkout.exit-code.txt"
[ "$checkout_status" -eq 0 ] || fail_env "frozen basis checkout failed"

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
clean_or_fail "before-runtime"

say "IDENTITY_GATE=PASS"

run_case "W2_A" "$W2A_TEST" "Writer2 W2.13 synthetic RESTRAINT product routing qualification passed."
w2a_status=$?
if [ "$w2a_status" -ne 0 ]; then
  say "BM_W2_01_04=NOT_RUN_BLOCKED_ON_W2_A"
  exit "$w2a_status"
fi

# Public retained-real benchmarks are admissible only after unchanged W2 A candidate PASS.
for spec in \
  "BM-W2-01|$BM01_TEST" \
  "BM-W2-02|$BM02_TEST" \
  "BM-W2-03|$BM03_TEST" \
  "BM-W2-04|$BM04_TEST"
do
  id="${spec%%|*}"
  path="${spec#*|}"
  run_case "$id" "$path"
  case_status=$?
  if [ "$case_status" -ne 0 ]; then
    say "BATCH_CLASSIFICATION=STOPPED_ON_FIRST_NONZERO"
    say "DOWNSTREAM_PUBLIC_BENCHMARKS=NOT_RUN"
    exit "$case_status"
  fi
done

clean_or_fail "after-batch"
say "BATCH_CANDIDATE=PASS_W2_A_AND_BM_W2_01_04"
say "NOTE=Candidate PASS requires repository-side evidence review before gate promotion; W2_B/W2.35/W2.35a/W2.40/W2_H are not promoted by this script."
say "EVIDENCE_DIR=$EVIDENCE_DIR"
exit 0
