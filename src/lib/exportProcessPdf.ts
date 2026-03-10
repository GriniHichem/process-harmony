import { supabase } from "@/integrations/supabase/client";

interface ProcessData {
  process: any;
  elements: any[];
  interactions: any[];
  targetProcesses: any[];
  documents: any[];
  indicators: any[];
  indicatorValues: Record<string, any[]>;
  risks: any[];
  responsableName: string;
  contextIssues: any[];
  contextIssueActions: Record<string, any[]>;
}

async function fetchAllProcessData(processId: string): Promise<ProcessData> {
  const [
    { data: process },
    { data: elements },
    { data: interactions },
    { data: allProcesses },
    { data: dpData },
    { data: indicators },
    { data: risks },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("processes").select("*").eq("id", processId).single(),
    supabase.from("process_elements").select("*").eq("process_id", processId).order("ordre"),
    supabase.from("process_interactions").select("*").eq("source_process_id", processId),
    supabase.from("processes").select("id, code, nom"),
    supabase.from("document_processes").select("document_id").eq("process_id", processId),
    supabase.from("indicators").select("*").eq("process_id", processId),
    supabase.from("risks_opportunities").select("*").eq("process_id", processId),
    supabase.from("profiles").select("id, nom, prenom, email"),
  ]);

  // Fetch documents
  let documents: any[] = [];
  if (dpData && dpData.length > 0) {
    const docIds = dpData.map((d: any) => d.document_id);
    const { data } = await supabase.from("documents").select("*").in("id", docIds).eq("archive", false);
    documents = data ?? [];
  }

  // Fetch indicator values
  const indicatorValues: Record<string, any[]> = {};
  if (indicators && indicators.length > 0) {
    const { data: allValues } = await supabase
      .from("indicator_values")
      .select("*")
      .in("indicator_id", indicators.map((i: any) => i.id))
      .order("date_mesure", { ascending: false });
    if (allValues) {
      for (const v of allValues) {
        if (!indicatorValues[v.indicator_id]) indicatorValues[v.indicator_id] = [];
        indicatorValues[v.indicator_id].push(v);
      }
    }
  }

  // Fetch context issues linked to this process
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
    interactions: interactions ?? [],
    targetProcesses: allProcesses ?? [],
    documents,
    indicators: indicators ?? [],
    indicatorValues,
    risks: risks ?? [],
    responsableName,
    contextIssues,
    contextIssueActions,
  };
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(data: ProcessData): string {
  const { process: p, elements, interactions, targetProcesses, documents, indicators, indicatorValues, risks, responsableName, contextIssues, contextIssueActions } = data;

  const typeLabels: Record<string, string> = {
    pilotage: "Management", realisation: "Réalisation", support: "Support",
  };
  const statutLabels: Record<string, string> = {
    brouillon: "Brouillon", en_validation: "En validation", valide: "Validé", archive: "Archivé",
  };
  const docTypeLabels: Record<string, string> = {
    procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire",
    enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve",
  };
  const riskTypeLabels: Record<string, string> = { risque: "Risque", opportunite: "Opportunité" };
  const freqLabels: Record<string, string> = {
    quotidien: "Quotidien", hebdomadaire: "Hebdomadaire", mensuel: "Mensuel",
    trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel",
  };

  const elByType = (type: string) => elements.filter(e => e.type === type);
  const getProcessName = (id: string) => {
    const pr = targetProcesses.find(tp => tp.id === id);
    return pr ? `${pr.code} – ${pr.nom}` : id;
  };

  // Group interactions by target
  const interByTarget: Record<string, any[]> = {};
  for (const i of interactions) {
    if (!interByTarget[i.target_process_id]) interByTarget[i.target_process_id] = [];
    interByTarget[i.target_process_id].push(i);
  }

  const elementSection = (title: string, type: string) => {
    const els = elByType(type);
    if (els.length === 0) return "";
    if (type === "finalite") {
      return `
        <div class="section-small">
          <h3>${title}</h3>
          ${els.map(e => `<div style="margin-bottom:6px;padding:6px 10px;background:#f8fafc;border-left:3px solid #1565c0;border-radius:3px;font-size:12px;line-height:1.6">
            <span class="mono" style="color:#888;margin-right:6px">${escapeHtml(e.code)}</span> ${escapeHtml(e.description)}
          </div>`).join("")}
        </div>`;
    }
    return `
      <div class="section-small">
        <h3>${title}</h3>
        <table>
          <thead><tr><th style="width:80px">Code</th><th>Description</th></tr></thead>
          <tbody>${els.map(e => `<tr><td class="mono">${escapeHtml(e.code)}</td><td>${escapeHtml(e.description)}</td></tr>`).join("")}</tbody>
        </table>
      </div>`;
  };

  const interactionsSection = () => {
    const entries = Object.entries(interByTarget);
    if (entries.length === 0) return "<p class='empty'>Aucune interaction définie</p>";
    return entries.map(([targetId, items]) => {
      const rows = items.map(item => {
        const el = elements.find(e => e.id === item.element_id);
        const dir = item.direction === "entree" ? "↓ Entrée" : "↑ Sortie";
        return `<tr><td>${dir}</td><td class="mono">${escapeHtml(el?.code)}</td><td>${escapeHtml(el?.description)}</td></tr>`;
      }).join("");
      return `
        <div class="sub-block">
          <h4>↔ ${escapeHtml(getProcessName(targetId))}</h4>
          <table>
            <thead><tr><th style="width:80px">Direction</th><th style="width:80px">Code</th><th>Description</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join("");
  };

  const documentsSection = () => {
    if (documents.length === 0) return "<p class='empty'>Aucun document associé</p>";
    return `<table>
      <thead><tr><th>Titre</th><th>Type</th><th>Version</th><th>Fichier</th></tr></thead>
      <tbody>${documents.map(d => `<tr>
        <td>${escapeHtml(d.titre)}</td>
        <td>${docTypeLabels[d.type_document] ?? d.type_document}</td>
        <td>v${d.version}</td>
        <td>${escapeHtml(d.nom_fichier) || "—"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  };

  const indicatorsSection = () => {
    if (indicators.length === 0) return "<p class='empty'>Aucun indicateur défini</p>";
    return indicators.map(ind => {
      const vals = indicatorValues[ind.id] ?? [];
      const lastVal = vals[0];
      return `
        <div class="sub-block">
          <h4>${escapeHtml(ind.nom)}</h4>
          <table>
            <tbody>
              <tr><td class="label-cell">Formule</td><td>${escapeHtml(ind.formule) || "—"}</td></tr>
              <tr><td class="label-cell">Unité</td><td>${escapeHtml(ind.unite) || "—"}</td></tr>
              <tr><td class="label-cell">Cible</td><td>${ind.cible ?? "—"}</td></tr>
              <tr><td class="label-cell">Seuil d'alerte</td><td>${ind.seuil_alerte ?? "—"}</td></tr>
              <tr><td class="label-cell">Fréquence</td><td>${freqLabels[ind.frequence] ?? ind.frequence}</td></tr>
              <tr><td class="label-cell">Dernière valeur</td><td>${lastVal ? `${lastVal.valeur} (${lastVal.date_mesure})` : "—"}</td></tr>
            </tbody>
          </table>
          ${vals.length > 1 ? `
            <p style="margin-top:4px;font-size:11px;color:#666">Historique (${vals.length} mesures) :</p>
            <table>
              <thead><tr><th>Date</th><th>Valeur</th><th>Commentaire</th></tr></thead>
              <tbody>${vals.slice(0, 10).map(v => `<tr><td>${v.date_mesure}</td><td>${v.valeur}</td><td>${escapeHtml(v.commentaire) || "—"}</td></tr>`).join("")}</tbody>
            </table>
          ` : ""}
        </div>`;
    }).join("");
  };

  const risksSection = () => {
    if (risks.length === 0) return "<p class='empty'>Aucun risque ou opportunité défini</p>";
    return `<table>
      <thead><tr><th>Type</th><th>Description</th><th>P</th><th>I</th><th>Criticité</th><th>Statut</th></tr></thead>
      <tbody>${risks.map(r => `<tr>
        <td>${riskTypeLabels[r.type] ?? r.type}</td>
        <td>${escapeHtml(r.description)}</td>
        <td>${r.probabilite ?? "—"}</td>
        <td>${r.impact ?? "—"}</td>
        <td><strong>${r.criticite ?? "—"}</strong></td>
        <td>${escapeHtml(r.statut)}</td>
      </tr>`).join("")}</tbody>
    </table>`;
  };

  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche Processus – ${escapeHtml(p.code)} ${escapeHtml(p.nom)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; line-height: 1.5; padding: 20px; }
  .company-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin-bottom: 6px; background: linear-gradient(135deg, #0d47a1, #1565c0); border-radius: 8px; color: #fff; }
  .company-header .company-logo { display: flex; align-items: center; gap: 14px; }
  .company-header .company-logo img { height: 44px; border-radius: 4px; }
  .company-header .company-info h2 { font-size: 16px; font-weight: 700; margin: 0; }
  .company-header .company-info p { font-size: 10px; opacity: 0.85; margin: 0; }
  .company-header .doc-ref { text-align: right; font-size: 10px; }
  .company-header .doc-ref strong { font-size: 12px; display: block; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1565c0; padding-bottom: 12px; margin-bottom: 20px; margin-top: 12px; }
  .header-left h1 { font-size: 20px; color: #1565c0; margin-bottom: 2px; }
  .header-left .code { font-family: monospace; font-size: 14px; color: #555; }
  .header-right { text-align: right; font-size: 11px; color: #666; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; padding: 10px; background: #f5f7fa; border-radius: 6px; }
  .meta-item { font-size: 11px; }
  .meta-item .label { font-weight: 600; color: #555; display: block; }
  .meta-item .value { color: #1a1a2e; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section h2 { font-size: 14px; color: #1565c0; border-bottom: 1.5px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 8px; }
  .section-small { margin-bottom: 10px; }
  .section-small h3 { font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px; }
  .sub-block { margin-bottom: 10px; padding-left: 8px; border-left: 2px solid #e0e0e0; }
  .sub-block h4 { font-size: 11px; font-weight: 600; color: #444; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
  th { background: #f0f4f8; font-weight: 600; color: #333; }
  .mono { font-family: monospace; font-size: 10px; }
  .label-cell { font-weight: 600; width: 140px; background: #fafafa; }
  .empty { font-style: italic; color: #999; font-size: 11px; }
  .signatures { margin-top: 40px; page-break-inside: avoid; }
  .signatures h2 { font-size: 14px; color: #1565c0; border-bottom: 1.5px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 12px; }
  .sig-table { width: 100%; border-collapse: collapse; }
  .sig-table th { background: #f0f4f8; font-weight: 600; color: #333; border: 1px solid #ccc; padding: 8px 10px; text-align: center; font-size: 11px; width: 33.33%; }
  .sig-table td { border: 1px solid #ccc; padding: 8px 10px; text-align: center; vertical-align: top; height: 80px; font-size: 10px; color: #888; }
  .sig-table .sig-name { font-size: 10px; color: #666; margin-bottom: 4px; }
  .sig-table .sig-date { font-size: 9px; color: #999; }
  .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;text-align:center">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer">
      📄 Imprimer / Exporter PDF
    </button>
  </div>

  <div class="company-header">
    <div class="company-logo">
      <img src="/images/logo-conserverie.jpg" alt="Conserverie du Maghreb" />
      <div class="company-info">
        <h2>Conserverie du Maghreb</h2>
        <p>Système de Management de la Qualité – ISO 9001</p>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div class="doc-ref">
        <strong>FICHE PROCESSUS</strong>
        Réf : ${escapeHtml(p.code)}<br>
        Version : ${p.version_courante}<br>
        Date : ${now}
      </div>
      <img src="/images/logo-amour.jpg" alt="AMOUR" style="height:40px;border-radius:4px;" />
    </div>
  </div>

  <div class="header">
    <div class="header-left">
      <div class="code">${escapeHtml(p.code)}</div>
      <h1>${escapeHtml(p.nom)}</h1>
    </div>
    <div class="header-right">
      <div>Version : ${p.version_courante}</div>
      <div>Date d'export : ${now}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span class="label">Type</span><span class="value">${typeLabels[p.type_processus] ?? p.type_processus}</span></div>
    <div class="meta-item"><span class="label">Statut</span><span class="value">${statutLabels[p.statut] ?? p.statut}</span></div>
    <div class="meta-item"><span class="label">Responsable</span><span class="value">${escapeHtml(responsableName)}</span></div>
    <div class="meta-item"><span class="label">Version</span><span class="value">v${p.version_courante}</span></div>
  </div>

  ${p.description ? `<div class="section"><h2>Description</h2><p>${escapeHtml(p.description)}</p></div>` : ""}

  <div class="section">
    <h2>Éléments du processus</h2>
    ${elementSection("Finalité", "finalite")}
    ${elementSection("Données d'entrée", "donnee_entree")}
    ${elementSection("Données de sortie", "donnee_sortie")}
    ${elementSection("Activités principales", "activite")}
    ${elementSection("Parties prenantes", "partie_prenante")}
    ${elementSection("Ressources", "ressource")}
  </div>

  <div class="section">
    <h2>Interactions inter-processus</h2>
    ${interactionsSection()}
  </div>

  <div class="section">
    <h2>Documents associés</h2>
    ${documentsSection()}
  </div>

  <div class="section">
    <h2>Indicateurs</h2>
    ${indicatorsSection()}
  </div>

  <div class="section">
    <h2>Risques & Opportunités</h2>
    ${risksSection()}
  </div>

  <div class="signatures">
    <h2>Approbation</h2>
    <table class="sig-table">
      <thead>
        <tr>
          <th>Pilote Processus</th>
          <th>Responsable Management Qualité</th>
          <th>Direction Générale</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="sig-name">Nom : ${escapeHtml(responsableName)}</div>
            <div class="sig-date">Date : __ / __ / ____</div>
            <br><br>
            <em>Signature</em>
          </td>
          <td>
            <div class="sig-name">Nom : _______________</div>
            <div class="sig-date">Date : __ / __ / ____</div>
            <br><br>
            <em>Signature</em>
          </td>
          <td>
            <div class="sig-name">Nom : _______________</div>
            <div class="sig-date">Date : __ / __ / ____</div>
            <br><br>
            <em>Signature</em>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    Conserverie du Maghreb – Fiche processus ${escapeHtml(p.code)} – ${escapeHtml(p.nom)} – Générée le ${now}
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
    // Fallback: download as HTML
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche-processus-${data.process.code}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
