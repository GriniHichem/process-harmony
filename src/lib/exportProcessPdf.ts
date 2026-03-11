import { supabase } from "@/integrations/supabase/client";
import { renderBpmnSvgString } from "./renderBpmnSvgString";
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
  };
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── HTML Builder ───────────────────────────────────────────────────

function buildHtml(data: ProcessData): string {
  const {
    process: p, elements, tasks, interactions, targetProcesses, documents,
    indicators, indicatorValues, indicatorActions, indicatorMoyens,
    risks, riskActions, riskMoyens, responsableName,
    contextIssues, contextIssueActions, acteurs,
  } = data;

  const typeLabels: Record<string, string> = { pilotage: "Management", realisation: "Réalisation", support: "Support" };
  const statutLabels: Record<string, string> = { brouillon: "Brouillon", en_validation: "En validation", valide: "Validé", archive: "Archivé" };
  const docTypeLabels: Record<string, string> = {
    procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire",
    enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve",
  };
  const riskTypeLabels: Record<string, string> = { risque: "Risque", opportunite: "Opportunité" };
  const freqLabels: Record<string, string> = {
    quotidien: "Quotidien", hebdomadaire: "Hebdomadaire", mensuel: "Mensuel",
    trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel",
  };
  const fluxLabels: Record<string, string> = {
    sequentiel: "Séquentiel", conditionnel: "Conditionnel", parallele: "Parallèle", inclusif: "Inclusif",
  };
  const domaineLabels: Record<string, string> = {
    strategique: "Stratégique", organisationnel: "Organisationnel", technique: "Technique",
    reglementaire: "Réglementaire", financier: "Financier", humain: "Humain",
    marche_client: "Marché/Client", fournisseur_prestataire: "Fournisseur", securite_cyber: "Sécurité/Cyber", environnement_climat: "Environnement/Climat",
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
  let sectionNum = 0;
  const sn = () => `${++sectionNum}`;

  // ── Section builders ──

  const elementTable = (title: string, type: string, num: string) => {
    const els = elByType(type);
    if (els.length === 0) return "";
    if (type === "finalite") {
      return `<div class="subsection">
        <h3>${num} ${title}</h3>
        ${els.map(e => `<div class="finalite-block">
          <span class="code-tag">${esc(e.code)}</span>
          <span>${esc(e.description)}</span>
        </div>`).join("")}
      </div>`;
    }
    return `<div class="subsection">
      <h3>${num} ${title}</h3>
      <table><thead><tr><th style="width:70px">Code</th><th>Description</th></tr></thead>
      <tbody>${els.map(e => `<tr><td class="code-cell">${esc(e.code)}</td><td>${esc(e.description)}</td></tr>`).join("")}</tbody></table>
    </div>`;
  };

  // Group interactions by target
  const interByTarget: Record<string, any[]> = {};
  for (const i of interactions) {
    if (!interByTarget[i.target_process_id]) interByTarget[i.target_process_id] = [];
    interByTarget[i.target_process_id].push(i);
  }

  // Root tasks and branch tasks
  const rootTasks = tasks.filter(t => !t.parent_code);
  const branchTasks = tasks.filter(t => t.parent_code);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche Processus – ${esc(p.code)} ${esc(p.nom)}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px; color: #1e293b; line-height: 1.55; padding: 20px;
    background: #fff;
  }

  /* ── Company Header ── */
  .company-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; margin-bottom: 4px;
    background: linear-gradient(135deg, #0c3d7a 0%, #1565c0 50%, #1976d2 100%);
    border-radius: 10px; color: #fff;
  }
  .company-header .left { display: flex; align-items: center; gap: 14px; }
  .company-header .left img { height: 48px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .company-header .left h2 { font-size: 17px; font-weight: 700; letter-spacing: 0.3px; }
  .company-header .left p { font-size: 9.5px; opacity: 0.8; margin-top: 2px; }
  .company-header .right { display: flex; align-items: center; gap: 16px; }
  .company-header .doc-ref { text-align: right; font-size: 9.5px; line-height: 1.6; }
  .company-header .doc-ref strong { font-size: 13px; letter-spacing: 1px; display: block; margin-bottom: 2px; }
  .company-header .right img { height: 42px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }

  /* ── Title Bar ── */
  .title-bar {
    display: flex; justify-content: space-between; align-items: flex-end;
    padding: 10px 0 8px; margin: 6px 0 14px;
    border-bottom: 3px solid #1565c0;
  }
  .title-bar h1 { font-size: 20px; color: #0d47a1; font-weight: 700; }
  .title-bar .code { font-family: 'Courier New', monospace; font-size: 13px; color: #64748b; }
  .title-bar .date-info { text-align: right; font-size: 10px; color: #94a3b8; }

  /* ── Meta Card ── */
  .meta-card {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
    border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 16px;
  }
  .meta-item {
    padding: 10px 14px; border-right: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .meta-item:last-child { border-right: none; }
  .meta-item .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 3px; }
  .meta-item .value { font-size: 12px; font-weight: 600; color: #1e293b; }

  /* ── Sections ── */
  .section {
    margin-bottom: 16px; page-break-inside: avoid;
    border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
  }
  .section-header {
    background: linear-gradient(135deg, #f0f5ff 0%, #e8f0fe 100%);
    padding: 8px 14px; border-bottom: 1px solid #dbeafe;
    display: flex; align-items: center; gap: 8px;
  }
  .section-header .num {
    background: #1565c0; color: #fff; font-size: 10px; font-weight: 700;
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .section-header h2 { font-size: 13px; font-weight: 700; color: #0d47a1; margin: 0; }
  .section-body { padding: 10px 14px; }

  /* ── Subsections ── */
  .subsection { margin-bottom: 10px; }
  .subsection h3 { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #f1f5f9; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { color: #334155; }
  .code-cell { font-family: 'Courier New', monospace; font-size: 10px; color: #64748b; background: #fafbfc; text-align: center; }
  .code-tag { display: inline-block; background: #e2e8f0; color: #475569; font-family: monospace; font-size: 9px; padding: 1px 6px; border-radius: 3px; margin-right: 6px; }
  .label-cell { font-weight: 600; width: 130px; background: #fafbfc; color: #475569; }
  .empty { font-style: italic; color: #94a3b8; font-size: 10.5px; padding: 8px 0; }

  /* ── Finalité ── */
  .finalite-block {
    margin-bottom: 6px; padding: 8px 12px;
    background: linear-gradient(to right, #f0f9ff, #f8fafc);
    border-left: 3px solid #1565c0; border-radius: 4px;
    font-size: 11px; line-height: 1.6;
  }

  /* ── Sub block ── */
  .sub-block { margin: 8px 0 8px 8px; padding-left: 10px; border-left: 2px solid #dbeafe; }
  .sub-block h4 { font-size: 10.5px; font-weight: 600; color: #1e40af; margin-bottom: 4px; }

  /* ── Risk badges ── */
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .badge-risk { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .badge-opp { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .badge-low { background: #fefce8; color: #a16207; }
  .badge-med { background: #fff7ed; color: #c2410c; }
  .badge-high { background: #fef2f2; color: #b91c1c; }
  .crit-cell { font-weight: 700; font-size: 12px; text-align: center; }

  /* ── Status ── */
  .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
  .status-todo { background: #f1f5f9; color: #64748b; }
  .status-progress { background: #dbeafe; color: #1d4ed8; }
  .status-done { background: #dcfce7; color: #15803d; }

  /* ── Signatures ── */
  .signatures { margin-top: 30px; page-break-inside: avoid; }
  .sig-table { width: 100%; border-collapse: collapse; border: 1.5px solid #cbd5e1; }
  .sig-table th { background: linear-gradient(135deg, #f0f5ff, #e8f0fe); font-weight: 600; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 10.5px; width: 33.33%; }
  .sig-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; vertical-align: top; height: 85px; }
  .sig-label { font-size: 9.5px; color: #64748b; margin-bottom: 2px; }

  /* ── Footer ── */
  .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8; text-align: center; }
  .footer strong { color: #64748b; }

  /* ── Print ── */
  @media print { body { padding: 0; } .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;text-align:center">
    <button onclick="window.print()" style="padding:10px 28px;font-size:14px;background:linear-gradient(135deg,#0d47a1,#1565c0);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(21,101,192,0.3)">
      📄 Imprimer / Exporter PDF
    </button>
  </div>

  <!-- ═══ COMPANY HEADER ═══ -->
  <div class="company-header">
    <div class="left">
      <img src="/images/logo-conserverie.jpg" alt="Conserverie du Maghreb" />
      <div>
        <h2>Conserverie du Maghreb</h2>
        <p>Système de Management de la Qualité — ISO 9001:2015</p>
      </div>
    </div>
    <div class="right">
      <div class="doc-ref">
        <strong>FICHE PROCESSUS</strong>
        Réf : ${esc(p.code)}<br>
        Version : ${p.version_courante}<br>
        Date : ${now}
      </div>
      <img src="/images/logo-amour.jpg" alt="AMOUR" />
    </div>
  </div>

  <!-- ═══ TITLE BAR ═══ -->
  <div class="title-bar">
    <div>
      <div class="code">${esc(p.code)}</div>
      <h1>${esc(p.nom)}</h1>
    </div>
    <div class="date-info">
      Version ${p.version_courante}<br>
      Export : ${now}
    </div>
  </div>

  <!-- ═══ META CARD ═══ -->
  <div class="meta-card">
    <div class="meta-item"><span class="label">Type de processus</span><span class="value">${typeLabels[p.type_processus] ?? p.type_processus}</span></div>
    <div class="meta-item"><span class="label">Statut</span><span class="value">${statutLabels[p.statut] ?? p.statut}</span></div>
    <div class="meta-item"><span class="label">Pilote processus</span><span class="value">${esc(responsableName)}</span></div>
    <div class="meta-item"><span class="label">Version courante</span><span class="value">v${p.version_courante}</span></div>
  </div>

  <!--
    ═══════════════════════════════════════════════════════════
    Structure conforme ISO 9001:2015 — Clause 4.4
    ═══════════════════════════════════════════════════════════
  -->

  <!-- ═══ 1. OBJET ET DOMAINE D'APPLICATION ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Objet et domaine d'application</h2></div>
    <div class="section-body">
      ${p.description ? `<p style="margin-bottom:8px">${esc(p.description)}</p>` : `<p class="empty">Non renseigné</p>`}
      ${elementTable("Finalité du processus", "finalite", "1.1")}
    </div>
  </div>

  <!-- ═══ 2. CONTEXTE DU PROCESSUS (cl. 4.1 / 4.2) ═══ -->
  ${contextIssues.length > 0 ? `
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Contexte du processus</h2></div>
    <div class="section-body">
      <div class="subsection">
        <h3>2.1 Enjeux internes et externes (cl. 4.1)</h3>
        <table>
          <thead><tr><th style="width:55px">Réf.</th><th style="width:55px">Type</th><th style="width:80px">Domaine</th><th>Intitulé</th><th>Description</th><th style="width:50px">Impact</th><th style="width:45px">Climat</th></tr></thead>
          <tbody>${contextIssues.map((ci: any) => `<tr>
            <td class="code-cell">${esc(ci.reference)}</td>
            <td>${ci.type_enjeu === "interne" ? "Interne" : "Externe"}</td>
            <td>${domaineLabels[ci.domaine] || ci.domaine || "—"}</td>
            <td><strong>${esc(ci.intitule)}</strong></td>
            <td>${esc(ci.description)}</td>
            <td><span class="badge ${ci.impact === "faible" ? "badge-low" : ci.impact === "moyen" ? "badge-med" : "badge-high"}">${ci.impact === "faible" ? "Faible" : ci.impact === "moyen" ? "Moyen" : "Fort"}</span></td>
            <td style="text-align:center">${ci.climat_pertinent ? "✓" : "—"}</td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
      ${contextIssues.some((ci: any) => (contextIssueActions[ci.id] ?? []).length > 0) ? `
      <div class="subsection">
        <h3>2.2 Actions de prise en compte</h3>
        ${contextIssues.filter((ci: any) => (contextIssueActions[ci.id] ?? []).length > 0).map((ci: any) => `
          <div class="sub-block">
            <h4>${esc(ci.reference)} – ${esc(ci.intitule)}</h4>
            <table>
              <thead><tr><th>Action</th><th style="width:90px">Responsable</th><th style="width:80px">Date revue</th><th style="width:65px">Statut</th></tr></thead>
              <tbody>${(contextIssueActions[ci.id] ?? []).map((a: any) => `<tr>
                <td>${esc(a.description)}</td>
                <td>${esc(a.responsable) || "—"}</td>
                <td>${a.date_revue || "—"}</td>
                <td><span class="status ${a.statut === "a_faire" ? "status-todo" : a.statut === "en_cours" ? "status-progress" : "status-done"}">${a.statut === "a_faire" ? "À faire" : a.statut === "en_cours" ? "En cours" : "Terminé"}</span></td>
              </tr>`).join("")}</tbody>
            </table>
          </div>
        `).join("")}
      </div>` : ""}
    </div>
  </div>` : (() => { sectionNum++; return ""; })()}

  <!-- ═══ 3. ÉLÉMENTS D'ENTRÉE ET DE SORTIE (cl. 4.4.1 a/b) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Données d'entrée et de sortie</h2></div>
    <div class="section-body">
      ${elementTable("Données d'entrée", "donnee_entree", `${sectionNum}.1`)}
      ${elementTable("Données de sortie", "donnee_sortie", `${sectionNum}.2`)}
      ${elByType("donnee_entree").length === 0 && elByType("donnee_sortie").length === 0 ? `<p class="empty">Aucune donnée d'entrée/sortie définie</p>` : ""}
    </div>
  </div>

  <!-- ═══ 4. SÉQUENCEMENT DES ACTIVITÉS (cl. 4.4.1 c) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Séquencement des activités</h2></div>
    <div class="section-body">
      ${elementTable("Activités principales", "activite", `${sectionNum}.1`)}
      ${tasks.length > 0 ? `
      <div class="subsection">
        <h3>${sectionNum}.2 Détail des activités et flux</h3>
        <table>
          <thead><tr>
            <th style="width:55px">Code</th>
            <th>Description</th>
            <th style="width:70px">Type flux</th>
            <th style="width:65px">Parent</th>
            <th style="width:70px">Condition</th>
            <th style="width:55px">Entrées</th>
            <th style="width:55px">Sorties</th>
            <th style="width:80px">Responsable</th>
          </tr></thead>
          <tbody>${rootTasks.map(t => {
            const children = branchTasks.filter(b => b.parent_code === t.code);
            const respName = t.responsable_id ? getActeurName(t.responsable_id) : "—";
            let rows = `<tr>
              <td class="code-cell">${esc(t.code)}</td>
              <td><strong>${esc(t.description)}</strong></td>
              <td>${fluxLabels[t.type_flux] ?? t.type_flux}</td>
              <td class="code-cell">—</td>
              <td>${esc(t.condition) || "—"}</td>
              <td class="code-cell">${esc(t.entrees) || "—"}</td>
              <td class="code-cell">${esc(t.sorties) || "—"}</td>
              <td>${esc(respName)}</td>
            </tr>`;
            for (const c of children) {
              const cResp = c.responsable_id ? getActeurName(c.responsable_id) : "—";
              rows += `<tr style="background:#fafbfe">
                <td class="code-cell">${esc(c.code)}</td>
                <td style="padding-left:20px">↳ ${esc(c.description)}</td>
                <td>${fluxLabels[c.type_flux] ?? c.type_flux}</td>
                <td class="code-cell">${esc(c.parent_code) || "—"}</td>
                <td>${esc(c.condition) || "—"}</td>
                <td class="code-cell">${esc(c.entrees) || "—"}</td>
                <td class="code-cell">${esc(c.sorties) || "—"}</td>
                <td>${esc(cResp)}</td>
              </tr>`;
            }
            return rows;
          }).join("")}</tbody>
        </table>
      </div>` : `<p class="empty">Aucune activité détaillée définie</p>`}
    </div>
  </div>

  <!-- ═══ 5. INTERACTIONS ENTRE PROCESSUS (cl. 4.4.1 c) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Interactions entre processus</h2></div>
    <div class="section-body">
      ${Object.entries(interByTarget).length > 0 ? Object.entries(interByTarget).map(([targetId, items]) => {
        const rows = items.map(item => {
          const el = elements.find(e => e.id === item.element_id);
          return `<tr>
            <td>${item.direction === "entree" ? "↓ Entrée" : "↑ Sortie"}</td>
            <td class="code-cell">${esc(el?.code)}</td>
            <td>${esc(el?.description)}</td>
          </tr>`;
        }).join("");
        return `<div class="sub-block">
          <h4>↔ ${esc(getProcessName(targetId))}</h4>
          <table><thead><tr><th style="width:75px">Direction</th><th style="width:65px">Code</th><th>Description</th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>`;
      }).join("") : `<p class="empty">Aucune interaction définie</p>`}
    </div>
  </div>

  <!-- ═══ 6. PARTIES PRENANTES (cl. 4.2) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Parties intéressées pertinentes</h2></div>
    <div class="section-body">
      ${elementTable("Parties prenantes", "partie_prenante", `${sectionNum}.1`)}
      ${elByType("partie_prenante").length === 0 ? `<p class="empty">Aucune partie prenante définie</p>` : ""}
    </div>
  </div>

  <!-- ═══ 7. RESSOURCES (cl. 7.1) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Ressources nécessaires</h2></div>
    <div class="section-body">
      ${elementTable("Ressources", "ressource", `${sectionNum}.1`)}
      ${elByType("ressource").length === 0 ? `<p class="empty">Aucune ressource définie</p>` : ""}
    </div>
  </div>

  <!-- ═══ 8. INFORMATIONS DOCUMENTÉES (cl. 7.5) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Informations documentées</h2></div>
    <div class="section-body">
      ${documents.length > 0 ? `
      <table>
        <thead><tr><th>Titre</th><th style="width:80px">Type</th><th style="width:45px">Version</th><th>Fichier</th></tr></thead>
        <tbody>${documents.map(d => `<tr>
          <td><strong>${esc(d.titre)}</strong></td>
          <td>${docTypeLabels[d.type_document] ?? d.type_document}</td>
          <td style="text-align:center">v${d.version}</td>
          <td>${esc(d.nom_fichier) || "—"}</td>
        </tr>`).join("")}</tbody>
      </table>` : `<p class="empty">Aucun document associé</p>`}
    </div>
  </div>

  <!-- ═══ 9. RISQUES ET OPPORTUNITÉS (cl. 6.1) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Risques et opportunités</h2></div>
    <div class="section-body">
      ${risks.length > 0 ? `
      ${risks.map(r => {
        const actions = riskActions[r.id] ?? [];
        const moyens = riskMoyens[r.id] ?? [];
        const critColor = (r.criticite ?? 0) >= 12 ? "color:#b91c1c" : (r.criticite ?? 0) >= 6 ? "color:#c2410c" : "color:#15803d";
        return `<div class="sub-block">
          <h4><span class="badge ${r.type === "risque" ? "badge-risk" : "badge-opp"}">${riskTypeLabels[r.type] ?? r.type}</span> ${esc(r.description)}</h4>
          <table>
            <tbody>
              <tr><td class="label-cell">Probabilité</td><td>${r.probabilite ?? "—"}</td><td class="label-cell">Impact</td><td>${r.impact ?? "—"}</td><td class="label-cell">Criticité</td><td class="crit-cell" style="${critColor}">${r.criticite ?? "—"}</td></tr>
              <tr><td class="label-cell">Statut</td><td>${esc(r.statut)}</td><td class="label-cell" colspan="2">Actions de traitement</td><td colspan="2">${esc(r.actions_traitement) || "—"}</td></tr>
            </tbody>
          </table>
          ${actions.length > 0 ? `
          <p style="font-size:10px;font-weight:600;color:#475569;margin:6px 0 3px">Plan d'actions :</p>
          <table>
            <thead><tr><th>Action</th><th style="width:80px">Responsable</th><th style="width:70px">Date prévue</th><th style="width:70px">Échéance</th><th style="width:60px">Statut</th></tr></thead>
            <tbody>${actions.map(a => `<tr>
              <td>${esc(a.description)}</td>
              <td>${esc(a.responsable) || "—"}</td>
              <td>${a.date_prevue || "—"}</td>
              <td>${a.deadline || "—"}</td>
              <td><span class="status ${a.statut === "a_faire" ? "status-todo" : a.statut === "en_cours" ? "status-progress" : "status-done"}">${a.statut === "a_faire" ? "À faire" : a.statut === "en_cours" ? "En cours" : "Terminé"}</span></td>
            </tr>`).join("")}</tbody>
          </table>` : ""}
          ${moyens.length > 0 ? `
          <p style="font-size:10px;font-weight:600;color:#475569;margin:6px 0 3px">Moyens alloués :</p>
          <table>
            <thead><tr><th>Moyen</th><th style="width:65px">Type</th><th style="width:70px">Budget</th><th style="width:80px">Responsable</th><th style="width:60px">Statut</th></tr></thead>
            <tbody>${moyens.map(m => `<tr>
              <td>${esc(m.description)}</td>
              <td>${moyenTypeLabels[m.type_moyen] || m.type_moyen}</td>
              <td>${m.budget ? `${m.budget} DA` : "—"}</td>
              <td>${esc(m.responsable) || "—"}</td>
              <td><span class="status ${m.statut === "a_faire" ? "status-todo" : m.statut === "en_cours" ? "status-progress" : "status-done"}">${m.statut === "a_faire" ? "À faire" : m.statut === "en_cours" ? "En cours" : "Terminé"}</span></td>
            </tr>`).join("")}</tbody>
          </table>` : ""}
        </div>`;
      }).join("")}` : `<p class="empty">Aucun risque ou opportunité défini</p>`}
    </div>
  </div>

  <!-- ═══ 10. SURVEILLANCE, MESURE ET INDICATEURS (cl. 9.1) ═══ -->
  <div class="section">
    <div class="section-header"><div class="num">${sn()}</div><h2>Surveillance, mesure et indicateurs de performance</h2></div>
    <div class="section-body">
      ${indicators.length > 0 ? indicators.map(ind => {
        const vals = indicatorValues[ind.id] ?? [];
        const actions = indicatorActions[ind.id] ?? [];
        const moyens = indicatorMoyens[ind.id] ?? [];
        const lastVal = vals[0];
        return `<div class="sub-block">
          <h4>${esc(ind.nom)}</h4>
          <table>
            <tbody>
              <tr><td class="label-cell">Type</td><td>${ind.type_indicateur === "activite" ? "Activité" : ind.type_indicateur === "resultat" ? "Résultat" : ind.type_indicateur === "perception" ? "Perception" : "Interne"}</td><td class="label-cell">Fréquence</td><td>${freqLabels[ind.frequence] ?? ind.frequence}</td></tr>
              <tr><td class="label-cell">Formule</td><td>${esc(ind.formule) || "—"}</td><td class="label-cell">Unité</td><td>${esc(ind.unite) || "—"}</td></tr>
              <tr><td class="label-cell">Cible</td><td>${ind.cible ?? "—"}</td><td class="label-cell">Seuil d'alerte</td><td>${ind.seuil_alerte ?? "—"}</td></tr>
              <tr><td class="label-cell">Dernière valeur</td><td colspan="3">${lastVal ? `<strong>${lastVal.valeur}</strong> ${esc(ind.unite) || ""} (${lastVal.date_mesure})` : "—"}</td></tr>
            </tbody>
          </table>
          ${vals.length > 1 ? `
          <p style="font-size:10px;font-weight:600;color:#475569;margin:6px 0 3px">Historique (${vals.length} mesures) :</p>
          <table>
            <thead><tr><th>Date</th><th>Valeur</th><th>Commentaire</th></tr></thead>
            <tbody>${vals.slice(0, 10).map(v => `<tr>
              <td>${v.date_mesure}</td><td><strong>${v.valeur}</strong></td><td>${esc(v.commentaire) || "—"}</td>
            </tr>`).join("")}</tbody>
          </table>` : ""}
          ${actions.length > 0 ? `
          <p style="font-size:10px;font-weight:600;color:#475569;margin:6px 0 3px">Plan d'actions :</p>
          <table>
            <thead><tr><th>Action</th><th style="width:80px">Responsable</th><th style="width:70px">Date prévue</th><th style="width:70px">Échéance</th><th style="width:60px">Statut</th></tr></thead>
            <tbody>${actions.map(a => `<tr>
              <td>${esc(a.description)}</td><td>${esc(a.responsable) || "—"}</td><td>${a.date_prevue || "—"}</td><td>${a.deadline || "—"}</td>
              <td><span class="status ${a.statut === "a_faire" ? "status-todo" : a.statut === "en_cours" ? "status-progress" : "status-done"}">${a.statut === "a_faire" ? "À faire" : a.statut === "en_cours" ? "En cours" : "Terminé"}</span></td>
            </tr>`).join("")}</tbody>
          </table>` : ""}
          ${moyens.length > 0 ? `
          <p style="font-size:10px;font-weight:600;color:#475569;margin:6px 0 3px">Moyens alloués :</p>
          <table>
            <thead><tr><th>Moyen</th><th style="width:65px">Type</th><th style="width:70px">Budget</th><th style="width:80px">Responsable</th><th style="width:60px">Statut</th></tr></thead>
            <tbody>${moyens.map(m => `<tr>
              <td>${esc(m.description)}</td><td>${moyenTypeLabels[m.type_moyen] || m.type_moyen}</td><td>${m.budget ? `${m.budget} DA` : "—"}</td><td>${esc(m.responsable) || "—"}</td>
              <td><span class="status ${m.statut === "a_faire" ? "status-todo" : m.statut === "en_cours" ? "status-progress" : "status-done"}">${m.statut === "a_faire" ? "À faire" : m.statut === "en_cours" ? "En cours" : "Terminé"}</span></td>
            </tr>`).join("")}</tbody>
          </table>` : ""}
        </div>`;
      }).join("") : `<p class="empty">Aucun indicateur défini</p>`}
    </div>
  </div>

  <!-- ═══ APPROBATION ═══ -->
  <div class="signatures">
    <div class="section-header" style="border-radius:8px 8px 0 0;margin-bottom:0"><div class="num">✓</div><h2>Approbation et signatures</h2></div>
    <table class="sig-table">
      <thead>
        <tr>
          <th>Pilote du Processus</th>
          <th>Responsable Management Qualité</th>
          <th>Direction Générale</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="sig-label">Nom : <strong>${esc(responsableName)}</strong></div>
            <div class="sig-label">Date : __ / __ / ____</div>
            <br><br><em style="color:#94a3b8;font-size:9px">Visa / Signature</em>
          </td>
          <td>
            <div class="sig-label">Nom : _______________</div>
            <div class="sig-label">Date : __ / __ / ____</div>
            <br><br><em style="color:#94a3b8;font-size:9px">Visa / Signature</em>
          </td>
          <td>
            <div class="sig-label">Nom : _______________</div>
            <div class="sig-label">Date : __ / __ / ____</div>
            <br><br><em style="color:#94a3b8;font-size:9px">Visa / Signature</em>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <strong>Conserverie du Maghreb</strong> — Fiche processus <strong>${esc(p.code)}</strong> — ${esc(p.nom)} — v${p.version_courante} — Générée le ${now}<br>
    <span style="font-size:8px">Document généré par Q-Process — Système de Management de la Qualité ISO 9001:2015</span>
  </div>
</body>
</html>`;
}

export async function exportProcessPdf(processId: string) {
  const data = await fetchAllProcessData(processId);
  const html = buildHtml(data);
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
