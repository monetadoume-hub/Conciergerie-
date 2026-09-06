import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  agencyName: { fontSize: 16, fontWeight: 700 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  subtitle: { fontSize: 10, color: "#666666", marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#eeeeee" },
  rowLabel: { color: "#444444" },
  rowValue: { fontWeight: 700 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", color: "#666666" },
  netRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 8, borderTopWidth: 2, borderTopColor: "#1a1a1a" },
  netLabel: { fontSize: 13, fontWeight: 700 },
  netValue: { fontSize: 13, fontWeight: 700 },
  pendingNotice: { marginTop: 8, padding: 8, backgroundColor: "#fff8e6", fontSize: 9, color: "#7a5c00" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999999", textAlign: "center" },
  paragraph: { marginBottom: 10, lineHeight: 1.5 },
  letterMeta: { marginBottom: 20, fontSize: 10, color: "#444444" },
});

export interface OwnerReportData {
  agencyName: string;
  ownerName: string;
  monthLabel: string;
  properties: { name: string; revenue: number; nights: number }[];
  totalRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  expenses: { category: string; amount: number }[];
  totalExpenses: number;
  netAmount: number;
  pendingRecoveryAmount: number;
}

// Owner monthly report PDF (cahier des charges §5.5, §21.6): white-labelled
// with the agency's name, one line per property, and — when a damage claim
// is still being recovered (§16) — the pending amount is called out
// separately so the owner never mistakes a temporary shortfall for a
// definitive loss.
export function OwnerReportDocument(data: OwnerReportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agencyName}>{data.agencyName}</Text>
          <Text style={styles.subtitle}>Rapport mensuel — {data.monthLabel}</Text>
        </View>

        <Text style={styles.title}>Propriétaire : {data.ownerName}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenus par bien</Text>
          {data.properties.map((p) => (
            <View key={p.name} style={styles.row}>
              <Text style={styles.rowLabel}>
                {p.name} ({p.nights} nuits)
              </Text>
              <Text style={styles.rowValue}>{p.revenue.toFixed(2)} €</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Revenu brut total</Text>
            <Text style={styles.rowValue}>{data.totalRevenue.toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission & dépenses</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Commission agence ({data.commissionRate}%)</Text>
            <Text style={styles.rowValue}>-{data.commissionAmount.toFixed(2)} €</Text>
          </View>
          {data.expenses.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>{e.category}</Text>
              <Text style={styles.rowValue}>-{e.amount.toFixed(2)} €</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total dépenses</Text>
            <Text style={styles.rowValue}>-{data.totalExpenses.toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net versé</Text>
          <Text style={styles.netValue}>{data.netAmount.toFixed(2)} €</Text>
        </View>

        {data.pendingRecoveryAmount > 0 && (
          <Text style={styles.pendingNotice}>
            Dont {data.pendingRecoveryAmount.toFixed(2)} € de frais avancés en attente de recouvrement (caution,
            assurance) — non déduits définitivement de votre résultat (cf. §16).
          </Text>
        )}

        <Text style={styles.footer}>
          Document généré automatiquement par {data.agencyName} — conservez-le avec vos documents comptables.
        </Text>
      </Page>
    </Document>
  );
}

export interface ComplaintLetterData {
  agencyName: string;
  agencyAddress?: string;
  recipientName: string;
  recipientAddress?: string;
  date: string;
  subject: string;
  body: string;
  signatureName?: string;
}

// Formal letter PDF for disputes/damage claims (cahier des charges §21.6):
// the agency always reviews and edits the body before this is generated —
// the assistant only ever proposes a draft, never sends this automatically.
export function ComplaintLetterDocument(data: ComplaintLetterData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.agencyName}>{data.agencyName}</Text>
            {data.agencyAddress && <Text style={{ fontSize: 9, color: "#666666" }}>{data.agencyAddress}</Text>}
          </View>
          <Text style={{ fontSize: 10 }}>{data.date}</Text>
        </View>

        <View style={styles.letterMeta}>
          <Text>{data.recipientName}</Text>
          {data.recipientAddress && <Text>{data.recipientAddress}</Text>}
        </View>

        <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 16 }}>Objet : {data.subject}</Text>

        {data.body.split("\n\n").map((paragraph, i) => (
          <Text key={i} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        {data.signatureName && <Text style={{ marginTop: 24 }}>{data.signatureName}</Text>}
      </Page>
    </Document>
  );
}
