import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseParticipants } from "@/components/ParticipantSelector";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const HEADER_STYLE = `
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px; color: #1e293b; line-height: 1.55; padding: 20px;
    background: #fff;
  }
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
  .title-bar {
    display: flex; justify-content: space-between; align-items: flex-end;
    padding: 10px 0 8px; margin: 6px 0 14px;
    border-bottom: 3px solid #1565c0;
  }
  .title-bar h1 { font-size: 20px; color: #0d47a1; font-weight: 700; }
  .title-bar .date-info { text-align: right; font-size: 10px; color: #94a3b8; }
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
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { color: #334155; }
  .label-cell { font-weight: 600; width: 130px; background: #fafbfc; color: #475569; }
  .empty { font-style: italic; color: #94a3b8; font-size: 10.5px; padding: 8px 0; }
  .rich-content { font-size: 11px; line-height: 1.6; }
  .rich-content p { margin-bottom: 6px; }
  .rich-content ul, .rich-content ol { margin-left: 16px; margin-bottom: 6px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-orange { background: #ffedd5; color: #9a3412; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .badge-purple { background: #f3e8ff; color: #6b21a8; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .status { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 600; }
  .status-todo { background: #f1f5f9; color: #64748b; }
  .status-progress { background: #dbeafe; color: #1d4ed8; }
  .status-done { background: #dcfce7; color: #16a34a; }
  .footer {
    margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0;
    text-align: center; font-size: 9px; color: #94a3b8;
  }
  .sig-table { margin-top: 10px; }
  .sig-table th { background: #f0f5ff; color: #0d47a1; font-size: 10px; text-align: center; }
  .sig-table td { height: 60px; vertical-align: top; padding: 8px; text-align: center; }
  .sig-label { font-size: 10px; color: #475569; margin-bottom: 4px; }
`;

function buildHeader(docTitle: string, docRef: string, version?: string) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `
  <div class="company-header">
    <div class="left">
      <img src="/images/logo-amour.jpg" alt="Groupe AMOUR" />
      <div>
        <h2>Groupe AMOUR</h2>
        <p>Système de Management de la Qualité — ISO 9001:2015</p>
      </div>
    </div>
    <div class="right">
      <div class="doc-ref">
        <strong>${esc(docRef)}</strong>
        ${version ? `Version : ${esc(version)}<br>` : ""}
        Date : ${now}
      </div>
      <img src="/images/logo-conserverie.jpg" alt="Conserverie du Maghreb" />
    </div>
  </div>
  <div class="title-bar">
    <h1>${esc(docTitle)}</h1>
    <div class="date-info">Générée le ${now}</div>
  </div>`;
}

function buildFooter(docRef: string, docTitle: string) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `
  <div class="footer">
    <strong>Conserverie du Maghreb</strong> — ${esc(docTitle)} — ${esc(docRef)} — Générée le ${now}<br>
    <span style="font-size:8px">Document généré par Q-Process — Système de Management de la Qualité ISO 9001:2015</span>
  </div>`;
}

function buildSignatures() {
  return `
  <div class="section" style="margin-top:20px">
    <div class="section-header"><h2>Approbation</h2></div>
    <div class="section-body">
      <table class="sig-table">
        <thead><tr><th>Responsable Management Qualité</th><th>Direction Générale</th></tr></thead>
        <tbody><tr>
          <td><div class="sig-label">Nom : _______________</div><div class="sig-label">Date : __ / __ / ____</div><br><br><em style="color:#94a3b8;font-size:9px">Visa / Signature</em></td>
          <td><div class="sig-label">Nom : _______________</div><div class="sig-label">Date : __ / __ / ____</div><br><br><em style="color:#94a3b8;font-size:9px">Visa / Signature</em></td>
        </tr></tbody>
      </table>
    </div>
  </div>`;
}

function openPdf(html: string, filename: string) {
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. POLITIQUE QUALITÉ
// ═══════════════════════════════════════════════════════════════

export async function exportPolitiqueQualitePdf() {
  const { data: policies } = await supabase.from("quality_policy").select("*").order("version", { ascending: false });
  const policy = policies?.[0];
  if (!policy) { alert("Aucune politique qualité trouvée."); return; }

  const { data: objectives } = await supabase.from("quality_objectives").select("*").order("reference");

  const statutLabels: Record<string, string> = { brouillon: "Brouillon", valide: "Validé", archive: "Archivé" };
  const statutObjLabels: Record<string, string> = { en_cours: "En cours", atteint: "Atteint", non_atteint: "Non atteint" };

  let sn = 0;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Politique Qualité</title><style>${HEADER_STYLE}</style></head><body>

  ${buildHeader("Politique Qualité", "POL-QUA", `v${policy.version}`)}

  <!-- Informations générales -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Informations générales</h2></div>
    <div class="section-body">
      <table>
        <tbody>
          <tr><td class="label-cell">Titre</td><td>${esc(policy.titre) || "Politique qualité"}</td></tr>
          <tr><td class="label-cell">Version</td><td>${policy.version}</td></tr>
          <tr><td class="label-cell">Statut</td><td><span class="badge badge-blue">${statutLabels[policy.statut] || policy.statut}</span></td></tr>
          <tr><td class="label-cell">Date d'approbation</td><td>${policy.date_approbation ? format(new Date(policy.date_approbation), "dd/MM/yyyy") : "Non approuvée"}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Contenu -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Engagement de la Direction</h2></div>
    <div class="section-body">
      <div class="rich-content">${policy.contenu || '<p class="empty">Non renseigné</p>'}</div>
    </div>
  </div>

  <!-- Objectifs stratégiques -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Objectifs stratégiques</h2></div>
    <div class="section-body">
      <div class="rich-content">${policy.objectifs || '<p class="empty">Non renseigné</p>'}</div>
    </div>
  </div>

  <!-- Objectifs qualité mesurables -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Objectifs qualité mesurables (cl. 6.2)</h2></div>
    <div class="section-body">
      ${(objectives && objectives.length > 0) ? `
      <table>
        <thead><tr><th>Réf.</th><th>Description</th><th>Indicateur</th><th>Cible</th><th>Échéance</th><th>Statut</th><th>Commentaire</th></tr></thead>
        <tbody>${objectives.map((o: any) => `<tr>
          <td style="font-family:monospace;font-size:10px">${esc(o.reference)}</td>
          <td>${esc(o.description)}</td>
          <td>${esc(o.indicateur)}</td>
          <td>${esc(o.cible)}</td>
          <td>${o.echeance ? format(new Date(o.echeance), "dd/MM/yyyy") : "—"}</td>
          <td><span class="badge ${o.statut === "atteint" ? "badge-green" : o.statut === "non_atteint" ? "badge-red" : "badge-blue"}">${statutObjLabels[o.statut] || o.statut}</span></td>
          <td style="font-size:10px">${esc(o.commentaire)}</td>
        </tr>`).join("")}</tbody>
      </table>` : '<p class="empty">Aucun objectif défini</p>'}
    </div>
  </div>

  ${buildSignatures()}
  ${buildFooter("POL-QUA", "Politique Qualité")}
  </body></html>`;

  openPdf(html, "politique-qualite.html");
}

// ═══════════════════════════════════════════════════════════════
// 2. OBJECTIFS QUALITÉ (standalone)
// ═══════════════════════════════════════════════════════════════

export async function exportObjectifsQualitePdf() {
  const { data: objectives } = await supabase.from("quality_objectives").select("*").order("reference");
  if (!objectives || objectives.length === 0) { alert("Aucun objectif qualité trouvé."); return; }

  const statutObjLabels: Record<string, string> = { en_cours: "En cours", atteint: "Atteint", non_atteint: "Non atteint" };

  const stats = {
    total: objectives.length,
    atteint: objectives.filter((o: any) => o.statut === "atteint").length,
    en_cours: objectives.filter((o: any) => o.statut === "en_cours").length,
    non_atteint: objectives.filter((o: any) => o.statut === "non_atteint").length,
  };

  let sn = 0;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Objectifs Qualité</title><style>${HEADER_STYLE}</style></head><body>

  ${buildHeader("Objectifs Qualité", "OBJ-QUA")}

  <!-- Synthèse -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Synthèse</h2></div>
    <div class="section-body">
      <table>
        <thead><tr><th>Total</th><th>En cours</th><th>Atteints</th><th>Non atteints</th></tr></thead>
        <tbody><tr>
          <td style="text-align:center;font-weight:700;font-size:14px">${stats.total}</td>
          <td style="text-align:center"><span class="badge badge-blue">${stats.en_cours}</span></td>
          <td style="text-align:center"><span class="badge badge-green">${stats.atteint}</span></td>
          <td style="text-align:center"><span class="badge badge-red">${stats.non_atteint}</span></td>
        </tr></tbody>
      </table>
    </div>
  </div>

  <!-- Détail -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Détail des objectifs qualité (cl. 6.2)</h2></div>
    <div class="section-body">
      <table>
        <thead><tr><th style="width:60px">Réf.</th><th>Description</th><th>Indicateur</th><th>Cible</th><th style="width:70px">Échéance</th><th style="width:65px">Statut</th></tr></thead>
        <tbody>${objectives.map((o: any) => `<tr>
          <td style="font-family:monospace;font-size:10px">${esc(o.reference)}</td>
          <td>${esc(o.description)}</td>
          <td>${esc(o.indicateur)}</td>
          <td>${esc(o.cible)}</td>
          <td>${o.echeance ? format(new Date(o.echeance), "dd/MM/yyyy") : "—"}</td>
          <td><span class="badge ${o.statut === "atteint" ? "badge-green" : o.statut === "non_atteint" ? "badge-red" : "badge-blue"}">${statutObjLabels[o.statut] || o.statut}</span></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
  </div>

  <!-- Commentaires détaillés -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Commentaires et suivi</h2></div>
    <div class="section-body">
      ${objectives.filter((o: any) => o.commentaire).map((o: any) => `
        <div style="margin-bottom:8px;padding:6px 10px;background:#fafbfc;border-left:3px solid #1565c0;border-radius:4px">
          <strong style="font-size:10px;color:#0d47a1">${esc(o.reference)} — ${esc(o.description)}</strong>
          <p style="font-size:10px;margin-top:3px;color:#475569">${esc(o.commentaire)}</p>
        </div>
      `).join("") || '<p class="empty">Aucun commentaire</p>'}
    </div>
  </div>

  ${buildFooter("OBJ-QUA", "Objectifs Qualité")}
  </body></html>`;

  openPdf(html, "objectifs-qualite.html");
}

// ═══════════════════════════════════════════════════════════════
// 3. REVUE DE DIRECTION
// ═══════════════════════════════════════════════════════════════

export async function exportRevueDirectionPdf(reviewId: string) {
  const [
    { data: review },
    { data: inputItems },
    { data: decisions },
    { data: acteurs },
  ] = await Promise.all([
    supabase.from("management_reviews").select("*").eq("id", reviewId).single(),
    supabase.from("review_input_items").select("*").eq("review_id", reviewId).order("ordre"),
    supabase.from("review_decisions").select("*").eq("review_id", reviewId).order("ordre"),
    supabase.from("acteurs").select("id, fonction, organisation"),
  ]);

  if (!review) { alert("Revue non trouvée."); return; }

  const statutLabels: Record<string, string> = { planifiee: "Planifiée", realisee: "Réalisée", cloturee: "Clôturée" };
  const getActeurName = (id: string | null) => {
    if (!id) return "—";
    const a = acteurs?.find((ac: any) => ac.id === id);
    return a ? (a.fonction || a.organisation || "Acteur") : "—";
  };

  const participants = parseParticipants(review.participants);
  const roots = (inputItems || []).filter((i: any) => !i.parent_id).sort((a: any, b: any) => a.ordre - b.ordre);
  const allItems = inputItems || [];

  const ENTITY_LABELS: Record<string, string> = {
    libre: "Point libre", processus: "Processus", indicateur: "Indicateur", risque: "Risque/Opp.",
    audit: "Audit", nc: "NC", action: "Action", document: "Document", incident: "Incident",
    enjeu: "Enjeu", fournisseur: "Fournisseur", satisfaction: "Satisfaction", competence: "Compétence",
  };

  const renderItem = (item: any, depth: number): string => {
    const children = allItems.filter((i: any) => i.parent_id === item.id).sort((a: any, b: any) => a.ordre - b.ordre);
    const indent = depth * 16;
    const typeLabel = ENTITY_LABELS[item.type] || item.type;
    return `
      <tr>
        <td style="padding-left:${indent + 8}px">
          <span class="badge badge-blue" style="margin-right:4px">${esc(typeLabel)}</span>
          ${esc(item.label)}
          ${item.commentaire ? `<br><em style="font-size:9px;color:#94a3b8">${esc(item.commentaire)}</em>` : ""}
        </td>
      </tr>
      ${children.map(c => renderItem(c, depth + 1)).join("")}
    `;
  };

  const actionDecisions = (decisions || []).filter((d: any) => d.type === "action");
  const statutActionLabels: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", terminee: "Terminée" };

  let sn = 0;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Revue de Direction — ${esc(review.reference)}</title><style>${HEADER_STYLE}</style></head><body>

  ${buildHeader("Revue de Direction", review.reference || "RD", "")}

  <!-- Informations générales -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Informations générales</h2></div>
    <div class="section-body">
      <table>
        <tbody>
          <tr><td class="label-cell">Référence</td><td>${esc(review.reference)}</td><td class="label-cell">Statut</td><td><span class="badge badge-blue">${statutLabels[review.statut] || review.statut}</span></td></tr>
          <tr><td class="label-cell">Date de la revue</td><td>${review.date_revue ? format(new Date(review.date_revue), "dd/MM/yyyy") : "—"}</td><td class="label-cell">Prochaine revue</td><td>${review.prochaine_revue ? format(new Date(review.prochaine_revue), "dd/MM/yyyy") : "—"}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Participants -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Participants</h2></div>
    <div class="section-body">
      ${participants.length > 0 ? `
      <table>
        <thead><tr><th>Nom</th><th>Fonction</th><th>Type</th></tr></thead>
        <tbody>${participants.map(p => `<tr>
          <td>${esc(p.name)}</td>
          <td>${esc(p.fonction || "")}</td>
          <td>${p.type === "guest" ? '<span class="badge badge-orange">Invité</span>' : '<span class="badge badge-blue">Utilisateur</span>'}</td>
        </tr>`).join("")}</tbody>
      </table>` : '<p class="empty">Aucun participant</p>'}
    </div>
  </div>

  <!-- Éléments d'entrée -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Éléments d'entrée de la revue (cl. 9.3.2)</h2></div>
    <div class="section-body">
      ${roots.length > 0 ? `
      <table>
        <thead><tr><th>Élément</th></tr></thead>
        <tbody>${roots.map(r => renderItem(r, 0)).join("")}</tbody>
      </table>` : '<p class="empty">Aucun élément d\'entrée</p>'}
    </div>
  </div>

  <!-- Décisions -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Décisions prises (cl. 9.3.3)</h2></div>
    <div class="section-body">
      <div class="rich-content">${review.decisions || '<p class="empty">Aucune décision enregistrée</p>'}</div>
    </div>
  </div>

  <!-- Actions décidées -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Actions décidées — Éléments de sortie (cl. 9.3.3)</h2></div>
    <div class="section-body">
      ${actionDecisions.length > 0 ? `
      <table>
        <thead><tr><th>Action</th><th style="width:100px">Responsable</th><th style="width:75px">Échéance</th><th style="width:65px">Statut</th><th style="width:60px">Source</th></tr></thead>
        <tbody>${actionDecisions.map((d: any) => `<tr>
          <td>${esc(d.description)}</td>
          <td>${getActeurName(d.responsable_id)}</td>
          <td>${d.echeance ? format(new Date(d.echeance), "dd/MM/yyyy") : "—"}</td>
          <td><span class="status ${d.statut === "a_faire" ? "status-todo" : d.statut === "en_cours" ? "status-progress" : "status-done"}">${statutActionLabels[d.statut] || d.statut}</span></td>
          <td>${d.source_entity_type ? '<span class="badge badge-gray">importé</span>' : "—"}</td>
        </tr>`).join("")}</tbody>
      </table>` : '<p class="empty">Aucune action décidée</p>'}
    </div>
  </div>

  <!-- Compte rendu -->
  <div class="section">
    <div class="section-header"><div class="num">${++sn}</div><h2>Compte rendu</h2></div>
    <div class="section-body">
      <div class="rich-content">${review.compte_rendu || '<p class="empty">Non renseigné</p>'}</div>
    </div>
  </div>

  ${buildSignatures()}
  ${buildFooter(review.reference || "RD", "Revue de Direction")}
  </body></html>`;

  openPdf(html, `revue-direction-${review.reference || reviewId}.html`);
}
