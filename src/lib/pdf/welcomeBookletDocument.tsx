import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { marginBottom: 20, textAlign: "center" },
  propertyName: { fontSize: 20, fontWeight: 700 },
  address: { fontSize: 10, color: "#666666", marginTop: 2 },
  section: { marginBottom: 16, breakInside: "avoid" },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#1a1a1a" },
  sectionRule: { height: 2, backgroundColor: "#1a1a1a", width: 28, marginBottom: 6 },
  paragraph: { lineHeight: 1.5, color: "#333333" },
  wifiBox: { flexDirection: "row", gap: 24, backgroundColor: "#f5f5f4", borderRadius: 6, padding: 12 },
  wifiLabel: { fontSize: 9, color: "#666666", textTransform: "uppercase" },
  wifiValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  emergencyBox: { marginTop: 6, borderWidth: 1, borderColor: "#dc2626", borderRadius: 6, padding: 12 },
  emergencyTitle: { fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 6 },
  emergencyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  emergencyLabel: { color: "#7f1d1d" },
  emergencyNumber: { fontWeight: 700, color: "#7f1d1d" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999999", textAlign: "center" },
});

export interface WelcomeBookletData {
  agencyName: string;
  agencyContact: string | null;
  propertyName: string;
  propertyAddress: string | null;
  accessCode: string | null;
  accessNotes: string | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  equipment: string | null;
  houseRules: string | null;
  checkoutInstructions: string | null;
  around: string | null;
  parkingInfo: string | null;
  pharmacyInfo: string | null;
  localEmergencyNotes: string | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
      {children}
    </View>
  );
}

// Printable A4 booklet meant to be left physically in the apartment — distinct
// from the digital guide (§14, sent by link to a specific stay): this one is
// generic to the property, not to a booking, and includes house rules,
// checkout instructions and emergency numbers that the digital guide doesn't.
export function WelcomeBookletDocument(data: WelcomeBookletData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.propertyName}>{data.propertyName}</Text>
          {data.propertyAddress && <Text style={styles.address}>{data.propertyAddress}</Text>}
        </View>

        <Section title="Wifi">
          <View style={styles.wifiBox}>
            <View>
              <Text style={styles.wifiLabel}>Réseau</Text>
              <Text style={styles.wifiValue}>{data.wifiNetwork || "—"}</Text>
            </View>
            <View>
              <Text style={styles.wifiLabel}>Mot de passe</Text>
              <Text style={styles.wifiValue}>{data.wifiPassword || "—"}</Text>
            </View>
          </View>
        </Section>

        <Section title="Accès">
          <Text style={styles.paragraph}>{data.accessNotes || "Voir les instructions transmises par l'agence."}</Text>
          {data.accessCode && (
            <Text style={[styles.paragraph, { marginTop: 4, fontWeight: 700 }]}>Code d&apos;accès : {data.accessCode}</Text>
          )}
        </Section>

        {data.equipment && (
          <Section title="Équipements">
            <Text style={styles.paragraph}>{data.equipment}</Text>
          </Section>
        )}

        {data.houseRules && (
          <Section title="Règles de la maison">
            <Text style={styles.paragraph}>{data.houseRules}</Text>
          </Section>
        )}

        {data.checkoutInstructions && (
          <Section title="Consignes de départ">
            <Text style={styles.paragraph}>{data.checkoutInstructions}</Text>
          </Section>
        )}

        {(data.around || data.parkingInfo || data.pharmacyInfo) && (
          <Section title="Autour de vous">
            {data.around && <Text style={styles.paragraph}>{data.around}</Text>}
            {data.parkingInfo && (
              <Text style={[styles.paragraph, { marginTop: 4 }]}>
                <Text style={{ fontWeight: 700 }}>Parking : </Text>
                {data.parkingInfo}
              </Text>
            )}
            {data.pharmacyInfo && (
              <Text style={[styles.paragraph, { marginTop: 4 }]}>
                <Text style={{ fontWeight: 700 }}>Pharmacie : </Text>
                {data.pharmacyInfo}
              </Text>
            )}
          </Section>
        )}

        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyTitle}>Numéros d&apos;urgence</Text>
          <View style={styles.emergencyRow}>
            <Text style={styles.emergencyLabel}>Police-secours</Text>
            <Text style={styles.emergencyNumber}>17</Text>
          </View>
          <View style={styles.emergencyRow}>
            <Text style={styles.emergencyLabel}>Pompiers</Text>
            <Text style={styles.emergencyNumber}>18</Text>
          </View>
          <View style={styles.emergencyRow}>
            <Text style={styles.emergencyLabel}>SAMU</Text>
            <Text style={styles.emergencyNumber}>15</Text>
          </View>
          <View style={styles.emergencyRow}>
            <Text style={styles.emergencyLabel}>Numéro d&apos;urgence européen</Text>
            <Text style={styles.emergencyNumber}>112</Text>
          </View>
          {data.localEmergencyNotes && (
            <Text style={[styles.paragraph, { marginTop: 6, color: "#7f1d1d" }]}>{data.localEmergencyNotes}</Text>
          )}
        </View>

        <Text style={styles.footer}>
          {data.agencyName}
          {data.agencyContact ? ` — ${data.agencyContact}` : ""} — livret d&apos;accueil du logement
        </Text>
      </Page>
    </Document>
  );
}
