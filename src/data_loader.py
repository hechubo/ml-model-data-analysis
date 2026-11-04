"""Ames Housing Dataset Loader & Validator."""

from __future__ import annotations

from pathlib import Path
import urllib.request
import pandas as pd


CDN_URLS = [
    "https://cdn.jsdelivr.net/gh/dapopov-st/housing-price-predictions@main/data/Ames_HousePrice.csv",
    "https://cdn.jsdelivr.net/gh/caiks/AMES@master/train.csv",
]

DEDUP_KEY_COLS = [
    "MSSubClass",
    "LotArea",
    "Neighborhood",
    "OverallQual",
    "OverallCond",
    "YearBuilt",
    "GrLivArea",
    "1stFlrSF",
    "2ndFlrSF",
    "YrSold",
    "MoSold",
    "SalePrice",
]


def _clean_frame(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    for drop_col in ["Unnamed: 0", "PID", "Id", "Order"]:
        if drop_col in work.columns:
            work = work.drop(columns=[drop_col])
    if "SalePrice" in work.columns:
        work["SalePrice"] = pd.to_numeric(work["SalePrice"], errors="coerce")
        work = work.dropna(subset=["SalePrice"])
    # Strip trailing whitespace on string columns
    for col in work.select_dtypes(include=["object"]).columns:
        work[col] = work[col].astype(str).str.strip()
        work.loc[work[col].isin(["nan", "None", "NA", ""]), col] = pd.NA
    return work.reset_index(drop=True)


def load_ames_raw(cache_dir: Path | str = Path("data/raw")) -> pd.DataFrame:
    """Load the classic Ames Housing dataset and cache locally to CSV."""
    cache_path = Path(cache_dir)
    cache_path.mkdir(parents=True, exist_ok=True)
    merged_file = cache_path / "ames_housing_full.csv"

    if merged_file.exists():
        df = pd.read_csv(merged_file)
        if "SalePrice" in df.columns and len(df) >= 1460:
            return df

    frames: list[pd.DataFrame] = []
    local_candidates = [
        cache_path / "ames_housing.csv",
        cache_path / "ames_kaggle_train.csv",
    ]
    for lf in local_candidates:
        if lf.exists():
            try:
                frames.append(_clean_frame(pd.read_csv(lf)))
            except Exception:
                pass

    if not frames:
        for url in CDN_URLS:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=12) as resp:
                    frames.append(_clean_frame(pd.read_csv(resp)))
            except Exception:
                pass

    if not frames:
        raise RuntimeError("Unable to load Ames Housing dataset from local cache or CDN mirrors.")

    common_cols = list(frames[0].columns)
    for f in frames[1:]:
        common_cols = [c for c in common_cols if c in f.columns]

    combined = pd.concat([f[common_cols] for f in frames], axis=0, ignore_index=True)
    dedup_cols = [c for c in DEDUP_KEY_COLS if c in combined.columns]
    combined = combined.drop_duplicates(subset=dedup_cols).reset_index(drop=True)
    combined.insert(0, "PropertyId", range(1, len(combined) + 1))
    combined.to_csv(merged_file, index=False)
    return combined
