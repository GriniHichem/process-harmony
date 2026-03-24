import { supabase } from "@/integrations/supabase/client";
import { renderBpmnSvgString } from "./renderBpmnSvgString";
import { renderFlowchartSvgString } from "./renderFlowchartSvgString";
import { BpmnData } from "@/components/bpmn/types";

interface ProcessData {
  process: any;
  elements: any[];
  tasks: any[];
  interactions: any[];
  targetProcesses: any[];
  documents: any[];
  indicators: any[];
  indicatorValues: Record<string, any[]>;
  indicatorActions: Record<string, any[]>;
  indicatorMoyens: Record<string, any[]>;
  risks: any[];
  riskActions: Record<string, any[]>;
  riskMoyens: Record<string, any[]>;
  responsableName: string;
  contextIssues: any[];
  contextIssueActions: Record<string, any[]>;
  acteurs: any[];
  bpmnData: BpmnData | null;
}

async function fetchAllProcessData(processId: string): Promise<ProcessData> {
  const [
    { data: process },
    { data: elements },
    { data: tasks },
    { data: interactions },
    { data: allProcesses },
    { data: dpData },
    { data: indicators },
    { data: risks },
    { data: profiles },
    { data: acteurs },
  ] = await Promise.all([
    supabase.from("processes").select("*").eq("id", processId).single(),
    supabase.from("process_elements").select("*").eq("process_id", processId).order("ordre"),
    supabase.from("process_tasks").select("*").eq("process_id", processId).order("ordre"),
    supabase.from("process_interactions").select("*").eq("source_process_id", processId),
    supabase.from("processes").select("id, code, nom"),
    supabase.from("document_processes").select("document_id").eq("process_id", processId),
    supabase.from("indicators").select("*").eq("process_id", processId),
    supabase.from("risks_opportunities").select("*").eq("process_id", processId),
    supabase.from("profiles").select("id, nom, prenom, email"),
    supabase.from("acteurs").select("id, fonction, organisation, description_poste"),
  ]);

  // Fetch documents
  let documents: any[] = [];
  if (dpData && dpData.length > 0) {
    const docIds = dpData.map((d: any) => d.document_id);
    const { data } = await supabase.from("documents").select("*").in("id", docIds).eq("archive", false);
    documents = data ?? [];
  }

  // Fetch indicator values, actions, moyens
  const indicatorValues: Record<string, any[]> = {};
  const indicatorActions: Record<string, any[]> = {};
  const indicatorMoyens: Record<string, any[]> = {};
  if (indicators && indicators.length > 0) {
    const indIds = indicators.map((i: any) => i.id);
    const [{ data: allValues }, { data: allIA }, { data: allIM }] = await Promise.all([
      supabase.from("indicator_values").select("*").in("indicator_id", indIds).order("date_mesure", { ascending: false }),
      supabase.from("indicator_actions").select("*").in("indicator_id", indIds).order("created_at"),
      supabase.from("indicator_moyens").select("*").in("indicator_id", indIds).order("created_at"),
    ]);
    for (const v of (allValues ?? [])) {
      if (!indicatorValues[v.indicator_id]) indicatorValues[v.indicator_id] = [];
      indicatorValues[v.indicator_id].push(v);
    }
    for (const a of (allIA ?? [])) {
      if (!indicatorActions[a.indicator_id]) indicatorActions[a.indicator_id] = [];
      indicatorActions[a.indicator_id].push(a);
    }
    for (const m of (allIM ?? [])) {
      if (!indicatorMoyens[m.indicator_id]) indicatorMoyens[m.indicator_id] = [];
      indicatorMoyens[m.indicator_id].push(m);
    }
  }

  // Fetch risk actions and moyens
  const riskActions: Record<string, any[]> = {};
  const riskMoyens: Record<string, any[]> = {};
  if (risks && risks.length > 0) {
    const riskIds = risks.map((r: any) => r.id);
    const [{ data: allRA }, { data: allRM }] = await Promise.all([
      supabase.from("risk_actions").select("*").in("risk_id", riskIds).order("created_at"),
      supabase.from("risk_moyens").select("*").in("risk_id", riskIds).order("created_at"),
    ]);
    for (const a of (allRA ?? [])) {
      if (!riskActions[a.risk_id]) riskActions[a.risk_id] = [];
      riskActions[a.risk_id].push(a);
    }
    for (const m of (allRM ?? [])) {
      if (!riskMoyens[m.risk_id]) riskMoyens[m.risk_id] = [];
      riskMoyens[m.risk_id].push(m);
    }
  }

  // Fetch context issues
  let contextIssues: any[] = [];
  let contextIssueActions: Record<string, any[]> = {};
  const { data: ciLinks } = await supabase.from("context_issue_processes").select("context_issue_id").eq("process_id", processId);
  if (ciLinks && ciLinks.length > 0) {
    const ciIds = ciLinks.map((l: any) => l.context_issue_id);
    const { data: ciData } = await supabase.from("context_issues").select("*").in("id", ciIds).order("reference");
    contextIssues = ciData ?? [];
    const { data: ciaData } = await supabase.from("context_issue_actions").select("*").in("context_issue_id", ciIds).order("created_at");
    if (ciaData) {
      for (const a of ciaData) {
        if (!contextIssueActions[a.context_issue_id]) contextIssueActions[a.context_issue_id] = [];
        contextIssueActions[a.context_issue_id].push(a);
      }
    }
  }

  // Fetch BPMN diagram if inclure_bpmn_pdf is true
  let bpmnData: BpmnData | null = null;
  if ((process as any)?.inclure_bpmn_pdf) {
    const { data: bpmnDiagrams } = await supabase
      .from("bpmn_diagrams")
      .select("donnees")
      .eq("process_id", processId)
      .order("version", { ascending: false })
      .limit(1);
    if (bpmnDiagrams && bpmnDiagrams.length > 0 && bpmnDiagrams[0].donnees) {
      bpmnData = bpmnDiagrams[0].donnees as unknown as BpmnData;
    }
  }

  const resp = profiles?.find((p: any) => p.id === process?.responsable_id);
  const responsableName = resp ? `${resp.prenom} ${resp.nom}`.trim() || resp.email : "Non assigné";

  return {
    process: process ?? {},
    elements: elements ?? [],
    tasks: tasks ?? [],
    interactions: interactions ?? [],
    targetProcesses: allProcesses ?? [],
    documents,
    indicators: indicators ?? [],
    indicatorValues,
    indicatorActions,
    indicatorMoyens,
    risks: risks ?? [],
    riskActions,
    riskMoyens,
    responsableName,
    contextIssues,
    contextIssueActions,
    acteurs: acteurs ?? [],
    bpmnData,
  };
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── HTML Builder ───────────────────────────────────────────────────

function buildHtml(data: ProcessData, logos: { companyLogo: string; brandLogo: string; companyName: string }): string {
  const {
    process: p, elements, tasks, interactions, targetProcesses, documents,
    indicators, indicatorActions, indicatorMoyens,
    risks, riskActions, riskMoyens, responsableName,
    contextIssues, contextIssueActions, acteurs, bpmnData,
  } = data;

  const typeLabels: Record<string, string> = { pilotage: "Management", realisation: "Réalisation", support: "Support" };
  const docTypeLabels: Record<string, string> = {
    procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire",
    enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve",
  };
  const freqLabels: Record<string, string> = {
    quotidien: "Quotidien", hebdomadaire: "Hebdomadaire", mensuel: "Mensuel",
    trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel",
  };
  const moyenTypeLabels: Record<string, string> = {
    humain: "Humain", materiel: "Matériel", financier: "Financier", logiciel: "Logiciel", autre: "Autre",
  };

  const elByType = (type: string) => elements.filter(e => e.type === type);
  const getProcessName = (id: string) => {
    const pr = targetProcesses.find(tp => tp.id === id);
    return pr ? `${pr.code} – ${pr.nom}` : id;
  };
  const getActeurName = (id: string) => {
    const a = acteurs.find(ac => ac.id === id);
    return a ? (a.fonction || a.description_poste || "Acteur") : "—";
  };

  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Helpers
  const actionsAndMoyens = (actions: any[], moyens: any[]) => {
    const items: string[] = [];
    for (const a of actions) items.push(`${esc(a.description)}${a.date_prevue ? ` <em>(${a.date_prevue})</em>` : ""}`);
    for (const m of moyens) items.push(`[${moyenTypeLabels[m.type_moyen] || m.type_moyen}] ${esc(m.description)}${m.budget ? ` — ${m.budget} DA` : ""}${m.date_prevue ? ` <em>(${m.date_prevue})</em>` : ""}`);
    return items.length > 0 ? items.map(i => `• ${i}`).join("<br>") : "—";
  };

  const actionsDateCol = (actions: any[], moyens: any[]) => {
    const dates: string[] = [];
    for (const a of actions) if (a.date_prevue || a.deadline) dates.push(a.date_prevue || a.deadline);
    for (const m of moyens) if (m.date_prevue || m.deadline) dates.push(m.date_prevue || m.deadline);
    return dates.length > 0 ? dates.join("<br>") : "—";
  };

  // Separate risks and opportunities
  const risques = risks.filter(r => r.type === "risque");
  const opportunites = risks.filter(r => r.type === "opportunite");

  // Group interactions
  const interByTarget: Record<string, any[]> = {};
  for (const i of interactions) {
    if (!interByTarget[i.target_process_id]) interByTarget[i.target_process_id] = [];
    interByTarget[i.target_process_id].push(i);
  }

  const interneIssues = contextIssues.filter(ci => ci.type_enjeu === "interne");
  const externeIssues = contextIssues.filter(ci => ci.type_enjeu === "externe");

  const checkbox = (checked: boolean) => checked
    ? `<span style="display:inline-block;width:14px;height:14px;border:1.5px solid #1565c0;border-radius:2px;text-align:center;line-height:14px;font-size:11px;color:#1565c0;font-weight:bold">✓</span>`
    : `<span style="display:inline-block;width:14px;height:14px;border:1.5px solid #94a3b8;border-radius:2px"></span>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche Processus – ${esc(p.code)} ${esc(p.nom)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  @page bpmn-landscape { size: A4 landscape; margin: 8mm 10mm; }
  .bpmn-page { page: bpmn-landscape; page-break-before: always; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px; color: #1e293b; line-height: 1.45;
    background: #fff; padding: 12px;
  }

  /* Header table */
  .hdr-table { width: 100%; border-collapse: collapse; border: 2px solid #1565c0; margin-bottom: 10px; }
  .hdr-table td { border: 1px solid #1565c0; padding: 6px 10px; vertical-align: middle; }
  .hdr-logo { width: 90px; text-align: center; }
  .hdr-logo img { max-height: 50px; max-width: 80px; }
  .hdr-center { text-align: center; background: linear-gradient(135deg, #e8f0fe, #f0f5ff); }
  .hdr-center .title { font-size: 15px; font-weight: 800; color: #0d47a1; letter-spacing: 1px; }
  .hdr-center .sub { font-size: 11px; color: #334155; margin-top: 2px; }
  .hdr-right { width: 170px; font-size: 9.5px; line-height: 1.6; }
  .hdr-right strong { color: #0d47a1; }

  /* Section title rows */
  .sec-title {
    background: linear-gradient(135deg, #0c3d7a, #1565c0);
    color: #fff; font-weight: 700; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.5px; padding: 6px 12px; text-align: center;
    border: 1px solid #0d47a1; page-break-after: avoid;
  }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 7px; text-align: left; font-size: 10px; }
  th { background: #e8f0fe; font-weight: 700; color: #0d47a1; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { color: #1e293b; }

  /* Meta table */
  .meta-table { margin-bottom: 8px; }
  .meta-table td { padding: 5px 10px; }
  .meta-label { font-weight: 700; color: #0d47a1; width: 180px; background: #f0f5ff; font-size: 10px; }
  .meta-val { font-size: 10.5px; }

  /* Checkbox row */
  .type-row { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; }
  .type-label { font-size: 10px; }

  .empty { font-style: italic; color: #94a3b8; font-size: 10px; padding: 6px; }
  .numbered { counter-reset: numlist; }
  .numbered tr { counter-increment: numlist; }
  .numbered td:first-child::before { content: counter(numlist) ". "; font-weight: 600; color: #64748b; }

  /* Signatures */
  .sig-table { width: 100%; border-collapse: collapse; border: 2px solid #1565c0; }
  .sig-table th { background: #e8f0fe; font-weight: 700; color: #0d47a1; border: 1px solid #1565c0; padding: 6px; text-align: center; font-size: 10px; width: 33.33%; }
  .sig-table td { border: 1px solid #1565c0; padding: 10px; text-align: center; vertical-align: top; height: 70px; }
  .sig-label { font-size: 9px; color: #475569; margin-bottom: 2px; }

  /* Footer */
  .footer { margin-top: 12px; border-top: 1px solid #cbd5e1; padding-top: 5px; font-size: 8px; color: #94a3b8; text-align: center; }
  .footer strong { color: #64748b; }

  .page-break { page-break-before: always; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:12px;text-align:center">
    <button onclick="window.print()" style="padding:10px 28px;font-size:14px;background:linear-gradient(135deg,#0d47a1,#1565c0);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(21,101,192,0.3)">
      📄 Imprimer / Exporter PDF
    </button>
  </div>

  <!-- ═══ HEADER ═══ -->
  <table class="hdr-table">
    <tr>
      <td class="hdr-logo"><img src="${logos.companyLogo}" alt="${esc(logos.companyName)}" /></td>
      <td class="hdr-center">
        <div class="title">FICHE DE PROCESSUS</div>
        <div class="sub">${esc(p.nom)}</div>
      </td>
      <td class="hdr-right">
        <strong>Code :</strong> ${esc(p.code)}<br>
        <strong>Date :</strong> ${now}<br>
        <strong>Version :</strong> ${p.version_courante}
      </td>
      <td class="hdr-logo"><img src="${logos.brandLogo}" alt="Logo marque" /></td>
    </tr>
  </table>

  <!-- ═══ META ═══ -->
  <table class="meta-table">
    <tr>
      <td class="meta-label">Pilote du processus</td>
      <td class="meta-val">${esc(responsableName)}</td>
      <td class="meta-label">Typologie</td>
      <td class="meta-val">
        <span class="type-row">${checkbox(p.type_processus === "pilotage")} <span class="type-label">Management</span></span>
        <span class="type-row">${checkbox(p.type_processus === "realisation")} <span class="type-label">Réalisation</span></span>
        <span class="type-row">${checkbox(p.type_processus === "support")} <span class="type-label">Support</span></span>
      </td>
    </tr>
    <tr>
      <td class="meta-label">Finalité du processus</td>
      <td class="meta-val" colspan="3">${elByType("finalite").map(e => esc(e.description)).join(" ; ") || "Non renseignée"}</td>
    </tr>
  </table>

  <!-- ═══ DONNÉES D'ENTRÉE ═══ -->
  <div class="sec-title">Données d'entrée</div>
  ${elByType("donnee_entree").length > 0 ? `
  <table><thead><tr><th style="width:60px">N°</th><th>Description</th></tr></thead>
  <tbody>${elByType("donnee_entree").map((e, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${esc(e.description)}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Aucune donnée d'entrée</p>`}

  <!-- ═══ DONNÉES DE SORTIE ═══ -->
  <div class="sec-title">Données de sortie</div>
  ${elByType("donnee_sortie").length > 0 ? `
  <table><thead><tr><th style="width:60px">N°</th><th>Description</th></tr></thead>
  <tbody>${elByType("donnee_sortie").map((e, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${esc(e.description)}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Aucune donnée de sortie</p>`}

  <!-- ═══ ACTIVITÉS ═══ -->
  <div class="sec-title">Activités du processus</div>
  ${tasks.length > 0 ? `
  <table><thead><tr><th style="width:70px">Code</th><th>Activité</th><th style="width:150px">Responsable</th></tr></thead>
  <tbody>${tasks.map(t => {
    const resp = t.responsable_id ? getActeurName(t.responsable_id) : "—";
    return `<tr><td style="text-align:center;font-family:monospace;font-size:9px">${esc(t.code)}</td><td>${t.parent_code ? "↳ " : ""}${esc(t.description)}</td><td>${esc(resp)}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="empty">Aucune activité définie</p>`}

  <!-- ═══ LOGIGRAMME (si BPMN désactivé) ═══ -->
  ${!p.inclure_bpmn_pdf && tasks.length > 0 ? (() => {
    const acteurMap: Record<string, string> = {};
    for (const a of acteurs) acteurMap[a.id] = a.fonction || a.description_poste || "Acteur";
    const svgStr = renderFlowchartSvgString(tasks, acteurMap, elements);
    return svgStr ? `
  <div class="sec-title">Logigramme du processus</div>
  <div style="text-align:center;padding:10px;border:1px solid #cbd5e1;margin-bottom:8px">
    ${svgStr}
  </div>` : "";
  })() : ""}

  <!-- ═══ INTERACTIONS ═══ -->
  <div class="sec-title">Processus en interaction</div>
  ${Object.keys(interByTarget).length > 0 ? `
  <table><thead><tr><th>Processus</th><th style="width:80px">Direction</th><th>Élément échangé</th></tr></thead>
  <tbody>${Object.entries(interByTarget).map(([targetId, items]) =>
    items.map(item => {
      const el = elements.find(e => e.id === item.element_id);
      return `<tr><td>${esc(getProcessName(targetId))}</td><td>${item.direction === "entree" ? "↓ Entrée" : "↑ Sortie"}</td><td>${esc(el?.description)}</td></tr>`;
    }).join("")
  ).join("")}</tbody></table>` : `<p class="empty">Aucune interaction définie</p>`}

  <!-- ═══ ENJEUX INTERNES ═══ -->
  <div class="sec-title">Enjeux internes (§4.1)</div>
  ${interneIssues.length > 0 ? `
  <table><thead><tr><th>Enjeu</th><th>Moyens et actions pour faire face</th><th style="width:100px">Date prévue</th></tr></thead>
  <tbody>${interneIssues.map(ci => {
    const cia = contextIssueActions[ci.id] ?? [];
    return `<tr><td><strong>${esc(ci.intitule)}</strong>${ci.description ? `<br><span style="font-size:9px;color:#64748b">${esc(ci.description)}</span>` : ""}</td>
    <td>${cia.length > 0 ? cia.map(a => `• ${esc(a.description)}`).join("<br>") : "—"}</td>
    <td>${cia.length > 0 ? cia.map(a => a.date_revue || "—").join("<br>") : "—"}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="empty">Aucun enjeu interne</p>`}

  <!-- ═══ ENJEUX EXTERNES ═══ -->
  <div class="sec-title">Enjeux externes (§4.1)</div>
  ${externeIssues.length > 0 ? `
  <table><thead><tr><th>Enjeu</th><th>Moyens et actions pour faire face</th><th style="width:100px">Date prévue</th></tr></thead>
  <tbody>${externeIssues.map(ci => {
    const cia = contextIssueActions[ci.id] ?? [];
    return `<tr><td><strong>${esc(ci.intitule)}</strong>${ci.description ? `<br><span style="font-size:9px;color:#64748b">${esc(ci.description)}</span>` : ""}</td>
    <td>${cia.length > 0 ? cia.map(a => `• ${esc(a.description)}`).join("<br>") : "—"}</td>
    <td>${cia.length > 0 ? cia.map(a => a.date_revue || "—").join("<br>") : "—"}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="empty">Aucun enjeu externe</p>`}

  <!-- ═══ PARTIES INTÉRESSÉES ═══ -->
  <div class="sec-title">Parties intéressées pertinentes (§4.2)</div>
  ${elByType("partie_prenante").length > 0 ? `
  <table><thead><tr><th style="width:60px">Code</th><th>Partie intéressée</th></tr></thead>
  <tbody>${elByType("partie_prenante").map(e => `<tr><td style="text-align:center;font-family:monospace;font-size:9px">${esc(e.code)}</td><td>${esc(e.description)}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Aucune partie prenante</p>`}

  <!-- ═══ RISQUES ═══ -->
  <div class="sec-title">Risques (§6.1)</div>
  ${risques.length > 0 ? `
  <table><thead><tr><th>Risque</th><th style="width:50px">P×G</th><th>Moyens et actions pour faire face</th><th style="width:100px">Date prévue</th></tr></thead>
  <tbody>${risques.map(r => {
    const ra = riskActions[r.id] ?? [];
    const rm = riskMoyens[r.id] ?? [];
    return `<tr><td><strong>${esc(r.description)}</strong></td><td style="text-align:center;font-weight:700">${r.criticite ?? "—"}</td>
    <td>${actionsAndMoyens(ra, rm)}</td><td>${actionsDateCol(ra, rm)}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="empty">Aucun risque</p>`}

  <!-- ═══ OPPORTUNITÉS ═══ -->
  <div class="sec-title">Opportunités (§6.1)</div>
  ${opportunites.length > 0 ? `
  <table><thead><tr><th>Opportunité</th><th style="width:50px">I×F</th><th>Actions à mettre en œuvre</th><th style="width:100px">Date prévue</th></tr></thead>
  <tbody>${opportunites.map(r => {
    const ra = riskActions[r.id] ?? [];
    const rm = riskMoyens[r.id] ?? [];
    return `<tr><td><strong>${esc(r.description)}</strong></td><td style="text-align:center;font-weight:700">${r.criticite ?? "—"}</td>
    <td>${actionsAndMoyens(ra, rm)}</td><td>${actionsDateCol(ra, rm)}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="empty">Aucune opportunité</p>`}

  <!-- ═══ INDICATEURS ═══ -->
  <div class="sec-title">Indicateurs de performance (§9.1)</div>
  ${indicators.length > 0 ? `
  <table><thead><tr><th>Indicateur</th><th style="width:80px">Objectif</th><th style="width:50px">Unité</th><th style="width:80px">Fréquence</th><th>Moyens et actions</th></tr></thead>
  <tbody>${indicators.map(ind => {
    const ia = indicatorActions[ind.id] ?? [];
    const im = indicatorMoyens[ind.id] ?? [];
    return `<tr><td><strong>${esc(ind.nom)}</strong></td><td style="text-align:center">${ind.cible ?? "—"}</td><td style="text-align:center">${esc(ind.unite) || "—"}</td>
    <td>${freqLabels[ind.frequence] ?? ind.frequence}</td><td>${actionsAndMoyens(ia, im)}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="empty">Aucun indicateur</p>`}

  <!-- ═══ RESSOURCES ═══ -->
  <div class="sec-title">Ressources (§7.1)</div>
  ${elByType("ressource").length > 0 ? `
  <table><thead><tr><th style="width:60px">Code</th><th>Description</th></tr></thead>
  <tbody>${elByType("ressource").map(e => `<tr><td style="text-align:center;font-family:monospace;font-size:9px">${esc(e.code)}</td><td>${esc(e.description)}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Aucune ressource</p>`}

  <!-- ═══ DOCUMENTS ═══ -->
  <div class="sec-title">Informations documentées (§7.5)</div>
  ${documents.length > 0 ? `
  <table><thead><tr><th>Titre</th><th style="width:90px">Type</th><th style="width:50px">Version</th></tr></thead>
  <tbody>${documents.map(d => `<tr><td>${esc(d.titre)}</td><td>${docTypeLabels[d.type_document] ?? d.type_document}</td><td style="text-align:center">v${d.version}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Aucun document</p>`}

  <!-- ═══ APPROBATION ═══ -->
  <div style="margin-top:16px">
    <div class="sec-title">Approbation et signatures</div>
    <table class="sig-table">
      <thead><tr><th>Pilote du Processus</th><th>Responsable Management Qualité</th><th>Direction Générale</th></tr></thead>
      <tbody><tr>
        <td><div class="sig-label">Nom : <strong>${esc(responsableName)}</strong></div><div class="sig-label">Date : __ / __ / ____</div><br><br><em style="color:#94a3b8;font-size:8px">Visa / Signature</em></td>
        <td><div class="sig-label">Nom : _______________</div><div class="sig-label">Date : __ / __ / ____</div><br><br><em style="color:#94a3b8;font-size:8px">Visa / Signature</em></td>
        <td><div class="sig-label">Nom : _______________</div><div class="sig-label">Date : __ / __ / ____</div><br><br><em style="color:#94a3b8;font-size:8px">Visa / Signature</em></td>
      </tr></tbody>
    </table>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <strong>${esc(logos.companyName)}</strong> — Fiche processus <strong>${esc(p.code)}</strong> — ${esc(p.nom)} — v${p.version_courante} — ${now}<br>
   <span style="font-size:7px">Document confidentiel — Système de Management de la Qualité ISO 9001:2015</span>
  </div>

  <!-- ═══ BPMN (dernière page, paysage) ═══ -->
  ${bpmnData && bpmnData.nodes.length > 0 ? `
  <div class="bpmn-page">
    <table class="hdr-table">
      <tr>
        <td class="hdr-logo"><img src="${logos.companyLogo}" alt="${esc(logos.companyName)}" /></td>
        <td class="hdr-center">
          <div class="title">DIAGRAMME BPMN</div>
          <div class="sub">${esc(p.nom)}</div>
        </td>
        <td class="hdr-right">
          <strong>Code :</strong> ${esc(p.code)}<br>
          <strong>Version :</strong> ${p.version_courante}
        </td>
        <td class="hdr-logo"><img src="${logos.brandLogo}" alt="Logo marque" /></td>
      </tr>
    </table>
    <div style="text-align:center;padding:16px;border:1px solid #cbd5e1;margin-top:10px">
      ${renderBpmnSvgString(bpmnData)}
    </div>
  </div>` : ""}
</body>
</html>`;
}

export async function exportProcessPdf(processId: string) {
  const data = await fetchAllProcessData(processId);
  const { data: settingsData } = await supabase.from("app_settings").select("key, value").in("key", ["logo_url", "brand_logo_url", "company_name"]);
  const logos = { companyLogo: "/images/logo-amour.jpg", brandLogo: "/images/logo-conserverie.jpg", companyName: "Groupe AMOUR" };
  if (settingsData) {
    for (const r of settingsData) {
      if (r.key === "logo_url" && r.value) logos.companyLogo = r.value;
      if (r.key === "brand_logo_url" && r.value) logos.brandLogo = r.value;
      if (r.key === "company_name" && r.value) logos.companyName = r.value;
    }
  }
  const html = buildHtml(data, logos);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche-processus-${data.process.code}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
