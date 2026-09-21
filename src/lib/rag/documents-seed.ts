// General-knowledge reference guidance summaries used to seed the shared
// RAG corpus. These are original, plain-language summaries of widely known
// public waste-management best practices associated with these bodies —
// they are NOT verbatim legal/regulatory text and must not be treated as an
// official legal document. They exist so the RAG pipeline has real,
// retrievable evidence to ground AI answers in.

export interface SeedDocument {
  title: string;
  source: string;
  category: "cpcb" | "moefcc" | "unep" | "e_waste";
  content: string;
}

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    title: "Solid Waste Segregation & Handling — General Guidance (CPCB-aligned)",
    source: "CPCB Guidance Summary",
    category: "cpcb",
    content: `Institutions generating solid waste are generally expected to segregate waste at source into at least three streams: biodegradable (wet/food) waste, non-biodegradable (dry) recyclable waste, and domestic hazardous waste (batteries, e-waste, sanitary waste). Segregated wet waste should be processed through composting or biomethanation where feasible instead of being sent to landfill. Dry recyclable waste (paper, plastic, glass, metal) should be handed over to authorized recyclers or waste collection agencies rather than mixed with general refuse. Bulk waste generators — including large institutions, campuses, and canteens — are typically encouraged to establish in-house processing for biodegradable waste and to maintain records of waste generation and disposal. Regular monitoring of waste quantities by category and by generating location helps institutions identify where waste reduction interventions (e.g., portion control, reusable packaging, composting units) will have the greatest impact. Institutions should avoid open burning of waste and should ensure hazardous fractions (e-waste, batteries) are channeled to authorized dismantlers or recyclers only.`,
  },
  {
    title: "Circular Economy & Waste Minimization — General Guidance (MoEFCC-aligned)",
    source: "MoEFCC Guidance Summary",
    category: "moefcc",
    content: `National waste management policy generally emphasizes a hierarchy of prevention, minimization, reuse, recycling, recovery, and disposal as a last resort. Institutions are encouraged to adopt cleaner production and circular-economy practices: reducing single-use plastic consumption, favoring reusable or compostable materials in cafeterias, and setting internal waste-reduction targets tracked over time. Extended producer responsibility principles apply to certain waste streams such as plastics and e-waste, meaning products and packaging should be channelled back into authorized recycling systems rather than general disposal. Institutions that monitor month-over-month and location-over-location waste trends are better positioned to identify unusual increases early and to evaluate whether awareness campaigns, portion-control measures, or vendor changes are reducing waste generation over time. Any waste-reduction claim should be supported by consistent measurement methodology (same units, same time periods) to remain credible.`,
  },
  {
    title: "Sustainable Consumption, Food Waste & Institutional Practice — General Guidance (UNEP-aligned)",
    source: "UNEP Guidance Summary",
    category: "unep",
    content: `Global food-loss-and-waste reduction guidance highlights that a substantial share of food waste in institutional settings (campuses, canteens, hostels) occurs at the serving and plate-waste stage. Recommended interventions include right-sizing portions, offering smaller default serving sizes with seconds available on request, trayless service, running targeted food-waste awareness campaigns, and diverting unavoidable food waste to composting or animal-feed programs rather than landfill. Institutions are encouraged to measure waste intensity (e.g., waste generated per person served or per meal served) rather than only absolute totals, because intensity metrics make it possible to compare performance across locations of different sizes and to track whether interventions are actually improving efficiency rather than just reflecting lower footfall. Event-driven spikes in waste (large gatherings, festivals) should be tracked separately from routine daily operations so that baseline trends are not distorted.`,
  },
  {
    title: "Electronic Waste (E-Waste) Handling — General Guidance",
    source: "E-Waste Management Guidance Summary",
    category: "e_waste",
    content: `Electronic waste should never be discarded with general or recyclable waste because it can contain hazardous substances (lead, mercury, cadmium, brominated flame retardants) that require specialized handling. Institutions should maintain a designated e-waste collection point and route all end-of-life electronics (batteries, cables, lamps, computers, peripherals) to authorized e-waste recyclers or dismantlers. Because e-waste volumes are typically small and irregular compared to daily food or packaging waste, even a small unexpected increase in recorded e-waste quantity at a location can be meaningful and worth investigating — for example bulk disposal of outdated equipment should be logged as a distinct, explained event rather than treated as routine daily waste. Institutions should track e-waste separately in their waste category data to ensure it is not diluted into a generic "Other" category, since this understates both risk and recycling opportunity.`,
  },
];
