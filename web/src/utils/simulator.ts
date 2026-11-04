import {
  SimulationInputParams,
  SimulationResult,
  SimulatorConfig,
  WaterfallContribution,
} from '../types/analytics';

const ORDINAL_QUALITY_MAP: Record<string, number> = {
  Ex: 5,
  Gd: 4,
  TA: 3,
  Fa: 2,
  Po: 1,
  None: 0,
};

export function runClientShapSimulation(
  simConfig: SimulatorConfig,
  params: SimulationInputParams
): SimulationResult {
  const total_sf = Number(params.total_sf || 2560);
  const overall_qual = Number(params.overall_qual || 7);
  const house_age = Math.max(0, Number(params.house_age ?? 18));
  const neighborhood = String(params.neighborhood || 'CollgCr');
  const total_bath = Number(params.total_bath || 2.5);
  const garage_cars = Number(params.garage_cars ?? 2);
  const kitchen_qual_str = String(params.kitchen_qual || 'Gd');
  const is_remodeled = Number(params.is_remodeled ?? 1);
  const lot_area = Math.max(1200, Number(params.lot_area || 9600));
  const fireplaces = Number(params.fireplaces ?? 1);

  const kitchen_num = ORDINAL_QUALITY_MAP[kitchen_qual_str] ?? 4;
  const remod_age = Math.max(0, house_age * (is_remodeled ? 0.45 : 1.0));
  const nb_te =
    simConfig.neighborhood_te_map[neighborhood] ?? simConfig.base_price;

  const qual_x_sf = overall_qual * total_sf;
  const gr_liv_area = total_sf * 0.63;
  const exter_num = Math.min(5, Math.max(2, Math.round(overall_qual * 0.55)));
  const bsmt_num = Math.min(5, Math.max(2, Math.round(overall_qual * 0.52)));
  const fireplace_num = fireplaces > 0 ? 3.5 : 0.0;
  const amenity_score =
    exter_num * 1.5 +
    kitchen_num * 1.8 +
    bsmt_num * 1.2 +
    fireplace_num * 0.8 +
    garage_cars * 1.4 +
    total_bath * 1.2;
  const qual_weighted_age = overall_qual / Math.log1p(house_age + 2.0);
  const lot_log1p = Math.log1p(lot_area);
  const total_porch_sf = Math.max(40.0, total_sf * 0.075);
  const bsmt_fin_ratio = overall_qual >= 7 ? 0.58 : 0.38;

  const featureValues: Record<string, number> = {
    OverallQual_x_TotalSF: qual_x_sf,
    TotalSF: total_sf,
    Neighborhood_TE: nb_te,
    AmenityScore: amenity_score,
    QualityWeightedAge: qual_weighted_age,
    OverallQual: overall_qual,
    GrLivArea: gr_liv_area,
    TotalBath: total_bath,
    HouseAge: house_age,
    GarageCars: garage_cars,
    KitchenQual_Num: kitchen_num,
    LotArea_Log1p: lot_log1p,
    RemodAge: remod_age,
    TotalPorchSF: total_porch_sf,
    BsmtFinRatio: bsmt_fin_ratio,
    Fireplaces: fireplaces,
  };

  const rawContribs: Record<string, number> = {};
  for (const [col, val] of Object.entries(featureValues)) {
    if (col in simConfig.ridge_usd_coefs) {
      const mean = simConfig.feature_means[col] ?? 0;
      const std = Math.max(1e-6, simConfig.feature_stds[col] ?? 1);
      const z = (val - mean) / std;
      rawContribs[col] = z * simConfig.ridge_usd_coefs[col];
    }
  }

  const groupedDrivers: [string, number, string][] = [
    [
      'Quality × Space Synergy (OverallQual×TotalSF)',
      rawContribs.OverallQual_x_TotalSF ?? 0,
      `${overall_qual} × ${total_sf.toLocaleString()} sq.ft`,
    ],
    [
      'Total Living & Bsmt Footprint (TotalSF)',
      (rawContribs.TotalSF ?? 0) + (rawContribs.GrLivArea ?? 0),
      `${total_sf.toLocaleString()} sq.ft`,
    ],
    [
      'Neighborhood Location Tier (Neighborhood_TE)',
      rawContribs.Neighborhood_TE ?? 0,
      `${neighborhood} ($${Math.round(nb_te).toLocaleString()})`,
    ],
    [
      'Construction Grade (OverallQual)',
      rawContribs.OverallQual ?? 0,
      `Grade ${overall_qual}/10`,
    ],
    [
      'Lifecycle & Renovation (HouseAge & Remod)',
      (rawContribs.HouseAge ?? 0) +
        (rawContribs.RemodAge ?? 0) +
        (rawContribs.QualityWeightedAge ?? 0),
      `${house_age} yrs (${is_remodeled ? 'Remodeled' : 'Original'})`,
    ],
    [
      'Composite Interior & Kitchen (AmenityScore)',
      (rawContribs.AmenityScore ?? 0) + (rawContribs.KitchenQual_Num ?? 0),
      `Kitchen ${kitchen_qual_str} · Score ${amenity_score.toFixed(1)}`,
    ],
    [
      'Bathrooms & Basement Finish (TotalBath)',
      (rawContribs.TotalBath ?? 0) + (rawContribs.BsmtFinRatio ?? 0),
      `${total_bath.toFixed(1)} Baths`,
    ],
    [
      'Garage & Fireplace Capacity',
      (rawContribs.GarageCars ?? 0) + (rawContribs.Fireplaces ?? 0),
      `${garage_cars} Cars · ${fireplaces} FP`,
    ],
    [
      'Parcel Lot & Outdoor Porch (LotArea_Log1p)',
      (rawContribs.LotArea_Log1p ?? 0) + (rawContribs.TotalPorchSF ?? 0),
      `${lot_area.toLocaleString()} sq.ft lot`,
    ],
  ];

  const base_price = simConfig.base_price;
  const total_delta = groupedDrivers.reduce((acc, item) => acc + item[1], 0);
  const predicted_price = Math.max(45000, Math.round(base_price + total_delta));
  const effective_delta = predicted_price - base_price;
  const scaleFactor =
    Math.abs(total_delta) > 1e-3 ? effective_delta / total_delta : 1.0;

  const sortedDrivers = [...groupedDrivers].sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );

  const waterfall: WaterfallContribution[] = [];
  let running = base_price;
  for (const [driver, delta, displayValue] of sortedDrivers) {
    const adjDelta = Math.round(delta * scaleFactor);
    const startUsd = running;
    const endUsd = running + adjDelta;
    running = endUsd;
    waterfall.push({
      driver,
      display_value: displayValue,
      delta_usd: adjDelta,
      start_usd: startUsd,
      end_usd: endUsd,
    });
  }

  if (waterfall.length > 0) {
    const sumDelta = waterfall.reduce((s, item) => s + item.delta_usd, 0);
    const diff = predicted_price - (base_price + sumDelta);
    waterfall[waterfall.length - 1].delta_usd += diff;
    waterfall[waterfall.length - 1].end_usd = predicted_price;
  }

  const quantiles = simConfig.price_quantiles || [];
  let pctRank = 50;
  if (quantiles.length > 0) {
    const idx = quantiles.findIndex((q) => q >= predicted_price);
    pctRank = idx === -1 ? 99 : Math.max(1, Math.min(99, idx + 1));
  }

  return {
    base_price,
    predicted_price,
    confidence_low: Math.round(predicted_price * 0.915),
    confidence_high: Math.round(predicted_price * 1.085),
    price_per_sqft: Number((predicted_price / Math.max(1, total_sf)).toFixed(2)),
    market_percentile: pctRank,
    engineered_readouts: {
      OverallQual_x_TotalSF: Math.round(qual_x_sf),
      AmenityScore: Number(amenity_score.toFixed(2)),
      QualityWeightedAge: Number(qual_weighted_age.toFixed(2)),
      Neighborhood_TE: Math.round(nb_te),
    },
    waterfall_contributions: waterfall,
  };
}
