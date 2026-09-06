import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  agencyName: { fontSize: 16, fontWeight: 700 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666666" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", color: "#666666" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#eeeeee" },
  metaLabel: { color: "#444444" },
  metaValue: { fontWeight: 700 },
  paragraph: { lineHeight: 1.5, marginBottom: 6 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photo: { width: 130, height: 130, objectFit: "cover", borderRadius: 4 },
  photoCaption: { fontSize: 8, color: "#888888", marginTop: 2, width: 130 },
  photoBlock: { marginBottom: 8 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1a1a1a", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#eeeeee" },
  colType: { width: "15%" },
  colLabel: { width: "40%" },
  colArtisan: { width: "25%" },
  colAmount: { width: "20%", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTopWidth: 2, borderTopColor: "#1a1a1a" },
  totalLabel: { fontSize: 13, fontWeight: 700 },
  totalValue: { fontSize: 13, fontWeight: 700 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999999", textAlign: "center" },
});

export interface DamageClaimPhoto {
  url: string;
  caption: string;
}

export interface DamageClaimDocumentLine {
  type: string;
  label: string;
  artisanName: string | null;
  amount: number | null;
}

export interface DamageClaimDossierData {
  agencyName: string;
  propertyName: string;
  propertyAddress: string | null;
  guestName: string | null;
  stayDates: string | null;
  reportedBy: string | null;
  damageType: string | null;
  damageDate: string | null;
  description: string;
  priority: string;
  photos: DamageClaimPhoto[];
  documents: DamageClaimDocumentLine[];
  totalCost: number;
  recoverySource: string | null;
  recoveryStatus: string | null;
  generatedAt: string;
}

const RECOVERY_SOURCE_LABEL: Record<string, string> = {
  caution_locataire: "Caution du locataire",
  assurance: "Assurance",
  agence: "Agence",
  proprietaire: "Propriétaire",
};

const RECOVERY_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  reclame: "Réclamé",
  recupere: "Récupéré",
  perdu: "Non recouvrable",
};

/**
 * Compiles a complete damage-claim dossier — description, dates, photos
 * (damage + the checkout cleaning report that caught it), quotes/invoices,
 * total cost — into a single PDF ready to hand to Airbnb's Resolution
 * Center, an insurer, or the guest. No third-party claims API exists for
 * this (see lib/pdf/generate.ts computeDamageClaimDossier), so this document
 * is deliberately self-contained rather than a partial form.
 */
export function DamageClaimDossierDocument(data: DamageClaimDossierData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agencyName}>{data.agencyName}</Text>
          <View>
            <Text style={styles.title}>Dossier de réclamation</Text>
            <Text style={styles.subtitle}>Généré le {data.generatedAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bien et séjour concernés</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Bien</Text>
            <Text style={styles.metaValue}>{data.propertyName}</Text>
          </View>
          {data.propertyAddress && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Adresse</Text>
              <Text style={styles.metaValue}>{data.propertyAddress}</Text>
            </View>
          )}
          {data.guestName && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Locataire</Text>
              <Text style={styles.metaValue}>{data.guestName}</Text>
            </View>
          )}
          {data.stayDates && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Séjour</Text>
              <Text style={styles.metaValue}>{data.stayDates}</Text>
            </View>
          )}
          {data.reportedBy && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Signalé par</Text>
              <Text style={styles.metaValue}>{data.reportedBy}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nature du dommage</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{data.damageType ?? "Non précisé"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date constatée</Text>
            <Text style={styles.metaValue}>{data.damageDate ?? "Non précisée"}</Text>
          </View>
          <Text style={[styles.paragraph, { marginTop: 8 }]}>{data.description}</Text>
        </View>

        {data.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos justificatives</Text>
            <View style={styles.photoGrid}>
              {data.photos.map((photo, i) => (
                <View key={i} style={styles.photoBlock}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={photo.url} style={styles.photo} />
                  <Text style={styles.photoCaption}>{photo.caption}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devis & factures</Text>
          {data.documents.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={styles.colType}>Type</Text>
                <Text style={styles.colLabel}>Libellé</Text>
                <Text style={styles.colArtisan}>Artisan</Text>
                <Text style={styles.colAmount}>Montant</Text>
              </View>
              {data.documents.map((doc, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colType}>{doc.type}</Text>
                  <Text style={styles.colLabel}>{doc.label}</Text>
                  <Text style={styles.colArtisan}>{doc.artisanName ?? "—"}</Text>
                  <Text style={styles.colAmount}>{doc.amount != null ? `${doc.amount.toFixed(2)} €` : "—"}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.paragraph}>Aucun devis ou facture joint à ce dossier.</Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Coût total du dommage</Text>
            <Text style={styles.totalValue}>{data.totalCost.toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recouvrement</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Source visée</Text>
            <Text style={styles.metaValue}>
              {data.recoverySource ? RECOVERY_SOURCE_LABEL[data.recoverySource] : "Non déterminée"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Statut</Text>
            <Text style={styles.metaValue}>
              {data.recoveryStatus ? RECOVERY_STATUS_LABEL[data.recoveryStatus] : "Non déterminé"}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dossier généré automatiquement par {data.agencyName} à des fins de réclamation (plateforme, assurance ou
          locataire). Photos et documents originaux disponibles sur demande.
        </Text>
      </Page>
    </Document>
  );
}
