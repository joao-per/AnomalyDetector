import type { Anomaly } from "@/api/types";
import type { Lang } from "@/i18n/translations";
import { dash, formatDate } from "./format";

/**
 * Default email body used to seed the composer before the user generates an AI
 * draft. Provided in both languages; known anomaly fields are substituted.
 */
export function vendorTemplate(a: Anomaly | null, lang: Lang): string {
  const order = dash(a?.orderId);
  const product = dash(a?.articleName ?? a?.articleId);
  const date = a ? formatDate(a.createdOn) : "—";

  if (lang === "de") {
    return `Hallo,

ich hoffe, es geht Ihnen gut.

Im Rahmen unserer Bestandsprüfung haben wir eine Anomalie bei der letzten Bierlieferung festgestellt.
Laut Bestellung/Rechnung sollten wir [erwartete Menge] Einheiten erhalten. Nach Prüfung des Lagerbestands wurden jedoch nur [erhaltene Menge] Einheiten erfasst.
Könnten Sie dies bitte auf Ihrer Seite prüfen und bestätigen, ob ein Fehler bei der Lieferung, dem Lieferschein oder der Rechnung vorliegt?

Nachfolgend die Zusammenfassung der Anomalie:
Bestellnummer: ${order}
Produkt: ${product}
Erwartete Menge: [Menge]
Erhaltene Menge: [Menge]
Festgestellte Differenz: [Differenz]
Lieferdatum: ${date}

Über Ihre Rückmeldung würden wir uns freuen, damit wir die Systemdaten korrigieren und entsprechend nachverfolgen können.
Vielen Dank.

Mit freundlichen Grüßen,`;
  }

  return `Hello,

I hope you are doing well.

During our stock verification process, we detected an anomaly related to the latest beer delivery.
According to the order/invoice, we were supposed to receive [expected quantity] units. However, after checking the warehouse stock, only [received quantity] units were registered.
Could you please verify this on your side and confirm whether there may have been an error in the shipment, delivery note, or invoice?

Please find the anomaly summary below:
Order number: ${order}
Product: ${product}
Expected quantity: [quantity]
Received quantity: [quantity]
Detected difference: [difference]
Delivery date: ${date}

We would appreciate your confirmation so we can correct the system records and follow up accordingly.
Thank you.

Best regards,`;
}

export function internalTemplate(a: Anomaly | null, lang: Lang): string {
  const order = dash(a?.orderId);
  const vendor = dash(a?.vendorName);
  const product = dash(a?.articleName ?? a?.articleId);
  const crit = dash(a?.criticalityClass);

  if (lang === "de") {
    return `Hallo,

bei der Bestandsprüfung wurde eine Anomalie zur folgenden Lieferung festgestellt:

Lieferant: ${vendor}
Bestellnummer: ${order}
Artikel: ${product}
Kritikalität: ${crit}

Bitte um Prüfung und Rückmeldung, wie weiter verfahren werden soll.

Danke und beste Grüße,`;
  }

  return `Hi,

during the stock check an anomaly was found for the following delivery:

Supplier: ${vendor}
Order number: ${order}
Article: ${product}
Criticality: ${crit}

Please review and advise how to proceed.

Thanks and best regards,`;
}
