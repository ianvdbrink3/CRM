// ─── Analyse Data Layer ────────────────────────────────────────────────────────
// All functions return the same shape regardless of source.
// Swap the mock implementations below for real API calls (Meta Ads, Shopify)
// without touching the UI.

export type Priority = "critical" | "warning" | "good";
export type DataSource = "meta_ads" | "shopify" | "combined";
export type InsightCategory =
  | "roas"
  | "cpa"
  | "budget"
  | "product"
  | "creative"
  | "audience"
  | "revenue";

export interface Metric {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "neutral";
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  why: string;
  priority: Priority;
  category: InsightCategory;
  source: DataSource;
  metric?: Metric;
  updatedAt: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  relatedInsightId?: string;
  source: DataSource;
}

export interface WatchItem {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  trend: string;
  source: DataSource;
}

export interface AnalyseData {
  insights: Insight[];
  recommendations: Recommendation[];
  watchItems: WatchItem[];
  lastSynced: string | null;
  isLive: boolean;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
// Replace this function body with real API calls when Meta Ads + Shopify are connected.

export async function fetchAnalyseData(): Promise<AnalyseData> {
  await new Promise((r) => setTimeout(r, 480));

  const insights: Insight[] = [
    {
      id: "ins-1",
      title: "ROAS gedaald met 12% in de afgelopen 7 dagen",
      description:
        "De gemiddelde ROAS over alle actieve campagnes is gedaald van 3.8 naar 3.3. De daling is het sterkst merkbaar bij Video-campagnes.",
      why: "Een dalende ROAS betekent dat elke euro advertentiebudget minder omzet oplevert. Bij de huidige trend kost het je over 30 dagen significant meer om hetzelfde resultaat te halen.",
      priority: "critical",
      category: "roas",
      source: "meta_ads",
      metric: { label: "ROAS", value: "3.3×", change: "-12%", direction: "down" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
    {
      id: "ins-2",
      title: "CPA stijgt sneller dan de omzet",
      description:
        "De kosten per aankoop zijn deze week met €4,20 gestegen terwijl de gemiddelde orderwaarde (AOV) gelijk bleef. Nettomarge staat hierdoor onder druk.",
      why: "Als de CPA sneller stijgt dan de AOV wordt elke sale structureel minder winstgevend. Dit is het vroegste signaal van advertentievermoeidheid of verhoogde concurrentieveiling.",
      priority: "critical",
      category: "cpa",
      source: "meta_ads",
      metric: { label: "CPA", value: "€28,40", change: "+17%", direction: "up" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
    {
      id: "ins-3",
      title: "Campagne 'Zomer Retargeting' genereert veel klikken maar weinig conversies",
      description:
        "CTR van 4,1% is bovengemiddeld, maar de conversieratio op de landingspagina bedraagt slechts 0,8% — ver onder het gemiddelde van 2,4%.",
      why: "De advertentie trekt de juiste aandacht, maar de landingspagina of het aanbod sluit niet aan op de verwachting. Budget wordt verspild aan klikken die niet converteren.",
      priority: "warning",
      category: "creative",
      source: "meta_ads",
      metric: { label: "CVR", value: "0,8%", change: "-66%", direction: "down" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
    {
      id: "ins-4",
      title: "78% van het advertentiebudget gaat naar één campagne",
      description:
        "Campagne 'Prospecting Breed' ontvangt €3.240 van het totale weekbudget van €4.150. Overige campagnes krijgen onvoldoende data om te optimaliseren.",
      why: "Budgetconcentratie verhoogt het risico: als die ene campagne tegenvalt, heeft het direct impact op de totale performance. Spreiding geeft het algoritme meer ruimte.",
      priority: "warning",
      category: "budget",
      source: "meta_ads",
      metric: { label: "Budgetaandeel", value: "78%", change: "+23%", direction: "up" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
    {
      id: "ins-5",
      title: "Product 'Draadloze Oplader Pro' heeft een hoge retourkans",
      description:
        "15,3% van de bestellingen van dit product wordt geretourneerd — meer dan 2× het gemiddelde van 6,8%. Klanten noemen 'niet zoals beschreven' als voornaamste reden.",
      why: "Een hoog retourpercentage drukt de nettomarge en beschadigt de klanttevredenheid. Het wijst op een mismatch tussen advertentiebelofte en productervaring.",
      priority: "warning",
      category: "product",
      source: "shopify",
      metric: { label: "Retourpercentage", value: "15,3%", change: "+8,5%", direction: "up" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
    {
      id: "ins-6",
      title: "Omzet dinsdag–donderdag structureel 34% hoger dan andere dagen",
      description:
        "Analyse van de afgelopen 4 weken toont een consistent patroon: di–do pieken in conversies terwijl het advertentiebudget gelijkmatig verdeeld is.",
      why: "Door budget te concentreren op hoogconversiedagen kun je dezelfde omzet halen met minder spend, of meer omzet met hetzelfde budget.",
      priority: "good",
      category: "revenue",
      source: "combined",
      metric: { label: "Omzet di–do vs rest", value: "+34%", change: "stabiel patroon", direction: "up" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
    {
      id: "ins-7",
      title: "UGC creative 'Unboxing v3' presteert 2,4× boven gemiddelde ROAS",
      description:
        "Van alle actieve advertentieformaten heeft 'Unboxing v3' de hoogste ROAS (8,1×) en de laagste CPA (€11,80). Huidige budgettoewijzing is slechts 8%.",
      why: "Topperformers verdienen meer budget. Door dit creative te schalen kun je de overall ROAS direct verbeteren zonder nieuwe productie.",
      priority: "good",
      category: "creative",
      source: "meta_ads",
      metric: { label: "ROAS", value: "8,1×", change: "+113%", direction: "up" },
      updatedAt: "2026-06-03T07:00:00Z",
    },
  ];

  const recommendations: Recommendation[] = [
    {
      id: "rec-1",
      title: "Schaal UGC creative 'Unboxing v3' op",
      description:
        "Verhoog het dagbudget van deze advertentie van €45 naar €150–200. Monitor de eerste 48 uur op ROAS-stabiliteit bij hogere spend.",
      action: "Pas dagbudget aan in Meta Ads Manager → Campagnes → Creatives",
      impact: "high",
      effort: "low",
      relatedInsightId: "ins-7",
      source: "meta_ads",
    },
    {
      id: "rec-2",
      title: "Verschuif budget naar di–do advertentieschema",
      description:
        "Stel een dagschema in dat 40–50% meer budget inzet op dinsdag, woensdag en donderdag. Dit direct toe te passen via dayparting in Meta.",
      action: "Activeer dayparting in Meta Ads → Advertentieset → Advertentieplanning",
      impact: "high",
      effort: "low",
      relatedInsightId: "ins-6",
      source: "combined",
    },
    {
      id: "rec-3",
      title: "Controleer de productpagina van 'Draadloze Oplader Pro'",
      description:
        "Vergelijk de advertentiebelofte met de productomschrijving en foto's. Voeg specificaties toe die de retourredenen ('niet zoals beschreven') direct weerleggen.",
      action: "Open Shopify → Producten → Draadloze Oplader Pro → Omschrijving bewerken",
      impact: "medium",
      effort: "low",
      relatedInsightId: "ins-5",
      source: "shopify",
    },
    {
      id: "rec-4",
      title: "Test nieuwe landingspagina voor 'Zomer Retargeting'",
      description:
        "De huidige CVR van 0,8% wijst op een aanbod/pagina-mismatch. Maak een dedicated landingspagina die aansluit op de zomercampagne-angle en test via A/B.",
      action: "Maak een nieuwe Shopify-pagina en koppel deze aan de advertentie-URL",
      impact: "high",
      effort: "medium",
      relatedInsightId: "ins-3",
      source: "combined",
    },
    {
      id: "rec-5",
      title: "Herverdeel budget over minimaal 3 campagnes",
      description:
        "Breng het aandeel van 'Prospecting Breed' terug naar max. 50% en alloceer het vrijgekomen budget naar 2 andere campagnes om data en spreiding op te bouwen.",
      action: "Pas budgets aan in Meta Ads → Campagneoverzicht",
      impact: "medium",
      effort: "low",
      relatedInsightId: "ins-4",
      source: "meta_ads",
    },
  ];

  const watchItems: WatchItem[] = [
    {
      id: "watch-1",
      title: "Frequency stijgt richting 3,5 voor primaire doelgroep",
      description:
        "Wanneer de advertentiefrequentie boven 3,0 komt daalt de CTR doorgaans snel. Huidige frequentie: 3,2 — ververs de creative voordat vermoeidheid toeslaat.",
      priority: "warning",
      trend: "Stijgend",
      source: "meta_ads",
    },
    {
      id: "watch-2",
      title: "Voorraad 'Draadloze Oplader Pro' nog 48 eenheden",
      description:
        "Bij het huidige verkooptempo (±12/dag) is de voorraad over 4 dagen uitgeput. Zorg voor tijdige nabestelling of pas de advertentieintensiteit tijdelijk aan.",
      priority: "critical",
      trend: "Kritiek",
      source: "shopify",
    },
    {
      id: "watch-3",
      title: "iOS 18 ATT-impact op attributie zichtbaar",
      description:
        "Gemiddeld 22% van de conversies wordt niet meer gerapporteerd via de Meta pixel. Overweeg server-side tracking (Conversions API) voor accuratere data.",
      priority: "warning",
      trend: "Structureel",
      source: "meta_ads",
    },
    {
      id: "watch-4",
      title: "Herhalingsaankopen stijgen — loyaliteitsmoment",
      description:
        "17% van de klanten van de afgelopen 90 dagen heeft een tweede aankoop gedaan. Een gerichte e-mailflow of retargetingcampagne kan dit verder verhogen.",
      priority: "good",
      trend: "Positief",
      source: "shopify",
    },
  ];

  return {
    insights,
    recommendations,
    watchItems,
    lastSynced: null,
    isLive: false,
  };
}
