/* MATMCD — page-specific data and table rendering.
   Every number below is transcribed from the paper's result tables. */
(function () {
  "use strict";

  const { $, el, ZH, tr, registerRender, rankMarks, bindChoices } = MC;

  /* ------------------------------------------------- runtime Chinese strings */
  Object.assign(ZH, {
    "Method": "方法",
    "Statistical causal discovery": "统计因果发现",
    "LLM-based causal discovery": "基于大模型的因果发现",
    "Hybrid approaches": "混合方法",
    "Ours": "本文方法",
    "Variants": "变体",
    "Iter.→Single search": "迭代搜索 → 单轮搜索",
    "w/o Knowledge LLM": "去掉 Knowledge LLM",
    "Copy": "复制",
    "Copied": "已复制"
  });

  /* --------------------------------------------------------------- helpers */
  /* Keep the paper's own precision: two decimals unless a third is written. */
  function num(v, d) {
    if (v == null) return "—";
    if (d === 0) return String(v);
    return Math.round(v * 1000) % 10 === 0 ? v.toFixed(2) : v.toFixed(3);
  }

  const METRICS = [
    { h: "Prc↑", better: "higher", d: 2 },
    { h: "F1↑",  better: "higher", d: 2 },
    { h: "FPR↓", better: "lower",  d: 2 },
    { h: "SHD↓", better: "lower",  d: 0 },
    { h: "NHD↓", better: "lower",  d: 2 }
  ];

  /* Build a two-row header: dataset group row, then the metric row. */
  function metricHead(thead, sets, metrics) {
    const g = el("tr", "grp");
    g.appendChild(el("th"));
    sets.forEach((s) => {
      const th = el("th", "sep", s);
      th.colSpan = metrics.length;
      g.appendChild(th);
    });
    const h = el("tr");
    h.appendChild(el("th", "name", tr("Method")));
    sets.forEach(() => metrics.forEach((m, i) => h.appendChild(el("th", i === 0 ? "sep" : "", m.h))));
    thead.replaceChildren(g, h);
  }

  function metricBody(tbody, sets, metrics, rows, groups) {
    /* best / second-best per (dataset, metric) over every visible row */
    const marks = {};
    sets.forEach((s) => {
      marks[s] = metrics.map((m, i) =>
        rankMarks(rows.map((r) => (r[s] ? r[s][i] : null)), m.better));
    });

    const body = [];
    let last = null;
    rows.forEach((r, ri) => {
      if (groups && groups[r.g] && r.g !== last) {
        last = r.g;
        const sr = el("tr", "section-row");
        const td = el("td", "", tr(groups[r.g]));
        td.colSpan = 1 + sets.length * metrics.length;
        sr.appendChild(td);
        body.push(sr);
      }
      const tr_ = el("tr");
      tr_.appendChild(el("td", "name", r.n));
      sets.forEach((s) => metrics.forEach((m, i) => {
        const v = r[s] ? r[s][i] : null;
        const cls = [i === 0 ? "sep" : "", marks[s][i][ri]].filter(Boolean).join(" ");
        tr_.appendChild(el("td", cls, num(v, m.d)));
      }));
      body.push(tr_);
    });
    tbody.replaceChildren(...body);
  }

  /* ============================================================ main results
     Comparison of causal discovery methods on the benchmark datasets.
     Row values are [Prc, F1, FPR, SHD, NHD]; null where the paper prints "-". */
  const GROUPS = {
    scd:  "Statistical causal discovery",
    llm:  "LLM-based causal discovery",
    hyb:  "Hybrid approaches",
    ours: "Ours"
  };

  const MAIN_ROWS = [
    { n: "PC", g: "scd",
      AutoMPG: [0.11, 0.14, 0.40, 8, 0.32], DWDClimate: [0.14, 0.15, 0.20, 9, 0.25],
      SachsProtein: [0.38, 0.44, 0.15, 24, 0.19],
      Asia: [0.50, 0.50, 0.07, 6, 0.09], Child: [0.30, 0.34, 0.06, 24, 0.06] },
    { n: "Exact Search", g: "scd",
      AutoMPG: [0.25, 0.30, 0.30, 6, 0.24], DWDClimate: [0.45, 0.58, 0.20, 6, 0.16],
      SachsProtein: [0.18, 0.23, 0.26, 31, 0.25],
      Asia: [0.50, 0.42, 0.05, 6, 0.09], Child: [0.35, 0.28, 0.02, 19, 0.04] },
    { n: "DirectLiNGAM", g: "scd",
      AutoMPG: [0.11, 0.14, 0.40, 8, 0.32], DWDClimate: [0.16, 0.22, 0.33, 10, 0.27],
      SachsProtein: [0.27, 0.36, 0.25, 29, 0.23],
      Asia: [0.28, 0.36, 0.17, 11, 0.17], Child: [0.29, 0.36, 0.07, 33, 0.08] },

    { n: "MAC*", g: "llm",
      AutoMPG: [null, null, null, 4, 0.16], DWDClimate: [null, null, null, 6, 0.19],
      SachsProtein: [null, null, null, 21, 0.19],
      Asia: null, Child: null },
    { n: "Efficient-CDLMs", g: "llm",
      AutoMPG: [0.66, 0.50, 0.05, 4, 0.16], DWDClimate: [0.33, 0.33, 0.13, 8, 0.22],
      SachsProtein: [0.33, 0.09, 0.02, 20, 0.16],
      Asia: [0.57, 0.53, 0.05, 7, 0.10], Child: [0.21, 0.20, 0.048, 37, 0.09] },

    { n: "SCD-LLM", g: "hyb",
      AutoMPG: [0.57, 0.66, 0.15, 3, 0.12], DWDClimate: [0.33, 0.22, 0.06, 7, 0.19],
      SachsProtein: [0.04, 0.05, 0.19, 29, 0.23],
      Asia: [0.60, 0.40, 0.03, 5, 0.07], Child: [0.56, 0.54, 0.02, 19, 0.04] },
    { n: "ReAct", g: "hyb",
      AutoMPG: [0.50, 0.54, 0.15, 4, 0.16], DWDClimate: [0.60, 0.40, 0.06, 6, 0.16],
      SachsProtein: [0.04, 0.04, 0.20, 29, 0.23],
      Asia: [0.40, 0.30, 0.05, 6, 0.09], Child: [0.56, 0.54, 0.02, 19, 0.04] },
    { n: "LLM-KBCI", g: "hyb",
      AutoMPG: [0.57, 0.66, 0.15, 3, 0.12], DWDClimate: [0.50, 0.40, 0.06, 6, 0.16],
      SachsProtein: [0.13, 0.14, 0.19, 27, 0.22],
      Asia: [0.42, 0.40, 0.07, 6, 0.09], Child: [0.48, 0.50, 0.03, 20, 0.05] },
    { n: "LLM-KBCI-RA", g: "hyb",
      AutoMPG: [0.57, 0.55, 0.15, 3, 0.12], DWDClimate: [0.75, 0.60, 0.03, 4, 0.11],
      SachsProtein: [0.08, 0.09, 0.20, 30, 0.24],
      Asia: [0.33, 0.28, 0.07, 7, 0.10], Child: [0.44, 0.46, 0.04, 21, 0.05] },
    { n: "LLM-KBCI-RE", g: "hyb",
      AutoMPG: [0.50, 0.61, 0.20, 4, 0.16], DWDClimate: [0.50, 0.40, 0.06, 6, 0.16],
      SachsProtein: [0.09, 0.10, 0.18, 28, 0.23],
      Asia: [0.28, 0.26, 0.08, 7, 0.10], Child: [0.40, 0.42, 0.04, 22, 0.05] },

    { n: "MATMCD", g: "ours",
      AutoMPG: [1.00, 0.88, 0.00, 1, 0.04], DWDClimate: [0.75, 0.88, 0.03, 4, 0.11],
      SachsProtein: [0.50, 0.42, 0.06, 17, 0.14],
      Asia: [0.50, 0.42, 0.05, 6, 0.09], Child: [0.48, 0.50, 0.03, 20, 0.05] },
    { n: "MATMCD-RE", g: "ours",
      AutoMPG: [0.57, 0.66, 0.15, 3, 0.12], DWDClimate: [0.50, 0.40, 0.06, 6, 0.16],
      SachsProtein: [0.31, 0.31, 0.12, 21, 0.17],
      Asia: [0.66, 0.57, 0.03, 4, 0.06], Child: [0.56, 0.54, 0.02, 19, 0.04] }
  ];

  const VIEWS = {
    cont: ["AutoMPG", "DWDClimate", "SachsProtein"],
    disc: ["Asia", "Child"]
  };
  let view = "cont";

  function renderMain() {
    const table = $("#main-table");
    if (!table) return;
    const sets = VIEWS[view];
    const rows = MAIN_ROWS.filter((r) => sets.every((s) => r[s]));
    metricHead(table.tHead, sets, METRICS);
    metricBody(table.tBodies[0], sets, METRICS, rows, GROUPS);
  }

  /* ================================================================ ablation
     Ablation analysis of MATMCD on the benchmark datasets. */
  const ABL_SETS = ["AutoMPG", "DWDClimate", "SachsProtein"];
  const ABL_ROWS = [
    { n: "MATMCD", g: "base",
      AutoMPG: [1.00, 0.88, 0.00, 1, 0.04], DWDClimate: [0.75, 0.88, 0.03, 4, 0.11],
      SachsProtein: [0.50, 0.42, 0.06, 17, 0.14] },
    { n: "Iter.→Single search", g: "var", zh: true,
      AutoMPG: [0.66, 0.72, 0.10, 2, 0.08], DWDClimate: [0.66, 0.44, 0.03, 5, 0.13],
      SachsProtein: [0.38, 0.22, 0.04, 17, 0.14] },
    { n: "w/o Knowledge LLM", g: "var", zh: true,
      AutoMPG: [0.50, 0.61, 0.20, 4, 0.16], DWDClimate: [0.66, 0.66, 0.06, 4, 0.11],
      SachsProtein: [0.19, 0.20, 0.16, 26, 0.21] },
    { n: "PC→ES", g: "var",
      AutoMPG: [0.33, 0.42, 0.30, 6, 0.24], DWDClimate: [0.50, 0.50, 0.10, 5, 0.13],
      SachsProtein: [0.26, 0.28, 0.16, 25, 0.20] },
    { n: "PC→DirectLiNGAM", g: "var",
      AutoMPG: [0.16, 0.18, 0.25, 6, 0.24], DWDClimate: [0.16, 0.22, 0.23, 9, 0.25],
      SachsProtein: [0.19, 0.22, 0.20, 27, 0.22] },
    { n: "LLM→GPT-4", g: "var",
      AutoMPG: [0.57, 0.66, 0.15, 3, 0.12], DWDClimate: [0.60, 0.54, 0.06, 5, 0.13],
      SachsProtein: [0.58, 0.45, 0.04, 15, 0.12] },
    { n: "LLM→Llama3.1-8B", g: "var",
      AutoMPG: [0.37, 0.46, 0.25, 5, 0.20], DWDClimate: [0.33, 0.22, 0.06, 7, 0.19],
      SachsProtein: [0.16, 0.18, 0.20, 29, 0.23] },
    { n: "LLM→Llama3.1-70B", g: "var",
      AutoMPG: [0.50, 0.54, 0.15, 4, 0.16], DWDClimate: [0.40, 0.36, 0.10, 7, 0.19],
      SachsProtein: [0.26, 0.26, 0.13, 24, 0.19] },
    { n: "LLM→Gemma2-9B", g: "var",
      AutoMPG: [0.37, 0.46, 0.25, 5, 0.20], DWDClimate: [0.16, 0.16, 0.16, 8, 0.22],
      SachsProtein: [0.16, 0.18, 0.20, 29, 0.23] },
    { n: "LLM→Ministral-7B", g: "var",
      AutoMPG: [0.60, 0.60, 0.10, 4, 0.16], DWDClimate: [0.33, 0.33, 0.13, 7, 0.19],
      SachsProtein: [0.21, 0.18, 0.10, 25, 0.20] }
  ];

  function renderAblation() {
    const table = $("#ablation-table");
    if (!table) return;
    const rows = ABL_ROWS.map((r) => (r.zh ? Object.assign({}, r, { n: tr(r.n) }) : r));
    metricHead(table.tHead, ABL_SETS, METRICS);
    metricBody(table.tBodies[0], ABL_SETS, METRICS, rows, { base: null, var: "Variants" });
  }

  /* ===================================================== root cause analysis
     Comparison of causal discovery methods for the RCA task. */
  const RCA_METRICS = [
    { h: "MAP@5↑",  better: "higher", pct: true },
    { h: "MAP@10↑", better: "higher", pct: true },
    { h: "MRR↑",    better: "higher", d: 2 },
    { h: "RK (P)↓", better: "lower",  d: 0 },
    { h: "RK (C)↓", better: "lower",  d: 0 }
  ];
  const RCA_ROWS = [
    { n: "PC",              g: "scd",  v: [0.0, 25.0, 0.14, 5, 13] },
    { n: "Efficient-CDLMs", g: "llm",  v: [0.0,  0.0, 0.10, 10, 10] },
    { n: "SCD-LLM",         g: "hyb",  v: [0.0, 25.0, 0.14, 5, 13] },
    { n: "ReAct",           g: "hyb",  v: [0.0, 25.0, 0.14, 5, 12] },
    { n: "LLM-KBCI",        g: "hyb",  v: [10.0, 30.0, 0.16, 4, 13] },
    { n: "LLM-KBCI-RA",     g: "hyb",  v: [0.0, 25.0, 0.14, 5, 12] },
    { n: "LLM-KBCI-RE",     g: "hyb",  v: [10.0, 30.0, 0.16, 4, 13] },
    { n: "MATMCD",          g: "ours", v: [30.0, 55.0, 0.32, 2, 7] },
    { n: "MATMCD-RE",       g: "ours", v: [20.0, 55.0, 0.25, 3, 6] }
  ];

  function renderRca() {
    const table = $("#rca-table");
    if (!table) return;
    const head = el("tr");
    head.appendChild(el("th", "name", tr("Method")));
    RCA_METRICS.forEach((m) => head.appendChild(el("th", "", m.h)));
    table.tHead.replaceChildren(head);

    const marks = RCA_METRICS.map((m, i) =>
      rankMarks(RCA_ROWS.map((r) => r.v[i]), m.better));

    const body = [];
    let last = null;
    RCA_ROWS.forEach((r, ri) => {
      if (r.g !== last) {
        last = r.g;
        const sr = el("tr", "section-row");
        const td = el("td", "", tr(GROUPS[r.g]));
        td.colSpan = 1 + RCA_METRICS.length;
        sr.appendChild(td);
        body.push(sr);
      }
      const row = el("tr");
      row.appendChild(el("td", "name", r.n));
      RCA_METRICS.forEach((m, i) => {
        const v = r.v[i];
        const txt = m.pct ? v.toFixed(1) + "%" : num(v, m.d);
        row.appendChild(el("td", marks[i][ri], txt));
      });
      body.push(row);
    });
    table.tBodies[0].replaceChildren(...body);
  }

  /* ------------------------------------------------------------------ wire */
  bindChoices("vartype-seg", "v", (v) => { view = v; renderMain(); });

  registerRender(renderMain);
  registerRender(renderAblation);
  registerRender(renderRca);
})();

MC.start();
