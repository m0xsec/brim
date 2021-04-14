import lib from "../lib"

export default function ast(tree: any) {
  return {
    valid() {
      return !tree.error
    },
    error() {
      return tree.error || null
    },
    groupByKeys() {
      const g = this.proc("Summarize")
      const keys = g ? g.keys : []
      return keys.map((k) => fieldExprToName(k.lhs || k.rhs))
    },
    proc(name: string) {
      return getProcs(tree).find((p) => p.kind === name)
    },
    procs(name: string): any[] {
      return getProcs(tree).filter((p) => p.kind === name)
    },
    getProcs() {
      return getProcs(tree)
    },
    self() {
      return tree
    },
    sorts() {
      return this.procs("Sort").reduce((sorts, proc) => {
        lib.array.wrap(proc.args).forEach((field) => {
          sorts[fieldExprToName(field)] = proc.sortdir === 1 ? "asc" : "desc"
        })
        return sorts
      }, {})
    }
  }
}

// XXX Note that this doesn't work for field names with embedded ".", e.g.,
//   o = { a: { b: 1 }, "a.b": 2}
//   o.a.b == 1
//   o["a.b"] == 2
function fieldExprToName(expr) {
  // strip leading "." generated by the RootRecord piece of the ast.
  let s = _fieldExprToName(expr)
  if (s[0] == ".") {
    s = s.substr(1)
  }
  return s
}

function _fieldExprToName(expr) {
  switch (expr.kind) {
    case "BinaryExpr":
      if (expr.op == "." || expr.op == "[") {
        return `${_fieldExprToName(expr.lhs)}.${_fieldExprToName(expr.rhs)}`
      }
      return "<not-a-field>"
    case "ID":
      return expr.name
    case "Root":
      return ""
    default:
      return "<not-a-field>"
  }
}

function getProcs(ast) {
  if (!ast || ast.error) return []
  const list = []
  collectProcs(ast, list)
  return list
}

function collectProcs(proc, list) {
  list.push(proc)
  if (COMPOUND_PROCS.includes(proc.kind)) {
    for (const p of proc.procs) collectProcs(p, list)
  }
}

export const HEAD_PROC = "Head"
export const TAIL_PROC = "Tail"
export const SORT_PROC = "Sort"
export const FILTER_PROC = "Filter"
export const PARALLEL_PROC = "Parallel"
export const SEQUENTIAL_PROC = "Sequential"
export const SOURCE_PROC = "SourceProc" //???
export const TUPLE_PROCS = [
  SOURCE_PROC,
  HEAD_PROC,
  TAIL_PROC,
  SORT_PROC,
  FILTER_PROC,
  SEQUENTIAL_PROC
]
export const COMPOUND_PROCS = [PARALLEL_PROC, SEQUENTIAL_PROC]
export const EVERYTHING_FILTER = {kind: "MatchAll"} // ???
