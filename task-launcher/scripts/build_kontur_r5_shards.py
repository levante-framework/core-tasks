#!/usr/bin/env python3
import argparse
import gzip
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from collections import OrderedDict

try:
    from h3 import h3
except ImportError as exc:
    raise SystemExit("Missing dependency: pip install h3") from exc

try:
    import pyarrow.dataset as ds
except ImportError as exc:
    raise SystemExit("Missing dependency: pip install pyarrow") from exc


DEFAULT_DATASET_URL = (
    "https://geodata-eu-central-1-kontur-public.s3.eu-central-1.amazonaws.com/"
    "kontur_datasets/kontur_population_20231101.gpkg.gz"
)


def download_file(url: str, dest_path: str) -> None:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with urllib.request.urlopen(url) as response, open(dest_path, "wb") as out_file:
        shutil.copyfileobj(response, out_file)


def gunzip_file(src_path: str, dest_path: str) -> None:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with gzip.open(src_path, "rb") as src, open(dest_path, "wb") as dest:
        shutil.copyfileobj(src, dest)


def ensure_parquet_from_gpkg(gpkg_path: str, parquet_path: str) -> None:
    if os.path.exists(parquet_path):
        return
    ogr2ogr = shutil.which("ogr2ogr")
    if not ogr2ogr:
        raise SystemExit("ogr2ogr not found; install GDAL to convert GPKG -> Parquet.")
    os.makedirs(os.path.dirname(parquet_path), exist_ok=True)
    cmd = [
        ogr2ogr,
        "-f",
        "Parquet",
        parquet_path,
        gpkg_path,
        "-select",
        "h3,population",
    ]
    subprocess.check_call(cmd)


def iter_rows_from_parquet(parquet_path: str):
    dataset = ds.dataset(parquet_path, format="parquet")
    for batch in dataset.to_batches(columns=["h3", "population"]):
        h3_col = batch.column(0).to_pylist()
        pop_col = batch.column(1).to_pylist()
        for h3_id, pop in zip(h3_col, pop_col):
            yield h3_id, pop


def merge_into(existing: dict, incoming: dict) -> dict:
    for res, cells in incoming.items():
        res_map = existing.setdefault(res, {})
        for cell_id, pop in cells.items():
            res_map[cell_id] = res_map.get(cell_id, 0) + pop
    return existing


def flush_shard(output_dir: str, r5_cell_id: str, shard_data: dict, gzip_output: bool) -> None:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{r5_cell_id}.json.gz" if gzip_output else f"{r5_cell_id}.json"
    output_path = os.path.join(output_dir, filename)
    existing = {}
    if os.path.exists(output_path):
        if gzip_output:
            with gzip.open(output_path, "rt", encoding="utf-8") as fh:
                existing = json.load(fh)
        else:
            with open(output_path, "r", encoding="utf-8") as fh:
                existing = json.load(fh)
    merged = merge_into(existing.get("resolutions", {}), shard_data)
    payload = {"resolutions": merged}
    if gzip_output:
        with gzip.open(output_path, "wt", encoding="utf-8") as fh:
            json.dump(payload, fh, separators=(",", ":"))
    else:
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, separators=(",", ":"))


def build_shards(
    input_path: str,
    output_dir: str,
    resolutions: list[int],
    max_shards: int,
    gzip_output: bool,
) -> None:
    shard_cache: OrderedDict[str, dict] = OrderedDict()

    def get_shard(r5_cell_id: str) -> dict:
        if r5_cell_id in shard_cache:
            shard_cache.move_to_end(r5_cell_id)
            return shard_cache[r5_cell_id]
        if len(shard_cache) >= max_shards:
            oldest_r5, oldest_data = shard_cache.popitem(last=False)
            flush_shard(output_dir, oldest_r5, oldest_data, gzip_output)
        shard_cache[r5_cell_id] = {str(res): {} for res in resolutions}
        return shard_cache[r5_cell_id]

    for h3_id, pop in iter_rows_from_parquet(input_path):
        if h3_id is None or pop is None:
            continue
        try:
            pop_val = float(pop)
        except (TypeError, ValueError):
            continue
        if pop_val <= 0:
            continue
        try:
            base_resolution = h3.h3_get_resolution(h3_id)
        except Exception:
            continue
        try:
            r5_cell = h3.h3_to_parent(h3_id, 5)
        except Exception:
            continue

        shard = get_shard(r5_cell)
        for res in resolutions:
            if res > base_resolution:
                continue
            try:
                parent = h3.h3_to_parent(h3_id, res)
            except Exception:
                continue
            res_map = shard[str(res)]
            res_map[parent] = res_map.get(parent, 0) + pop_val

    for r5_cell, data in shard_cache.items():
        flush_shard(output_dir, r5_cell, data, gzip_output)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build R5-sharded Kontur H3 population cache.")
    parser.add_argument("--input", help="Input Parquet file with h3,population columns.")
    parser.add_argument("--output", default="data/kontur-h3-r5", help="Output shard directory.")
    parser.add_argument("--resolutions", default="5,6,7", help="Comma-separated resolutions to build.")
    parser.add_argument("--max-shards", type=int, default=64, help="Max in-memory shard count.")
    parser.add_argument("--download", action="store_true", help="Download and convert dataset.")
    parser.add_argument("--gzip", action="store_true", help="Write .json.gz shards.")
    args = parser.parse_args()

    if args.download:
        raw_dir = os.path.join("data", "kontur", "raw")
        os.makedirs(raw_dir, exist_ok=True)
        gz_path = os.path.join(raw_dir, "kontur_population_20231101.gpkg.gz")
        gpkg_path = os.path.join(raw_dir, "kontur_population_20231101.gpkg")
        parquet_path = os.path.join(raw_dir, "kontur_population_20231101.parquet")
        if not os.path.exists(gz_path):
            print(f"Downloading {DEFAULT_DATASET_URL} ...")
            download_file(DEFAULT_DATASET_URL, gz_path)
        if not os.path.exists(gpkg_path):
            print("Extracting .gpkg.gz ...")
            gunzip_file(gz_path, gpkg_path)
        ensure_parquet_from_gpkg(gpkg_path, parquet_path)
        input_path = parquet_path
    else:
        input_path = args.input

    if not input_path or not os.path.exists(input_path):
        raise SystemExit("Input Parquet file not found. Use --input or --download.")

    resolutions = [int(x.strip()) for x in args.resolutions.split(",") if x.strip()]
    build_shards(
        input_path=input_path,
        output_dir=args.output,
        resolutions=resolutions,
        max_shards=max(args.max_shards, 1),
        gzip_output=args.gzip,
    )
    print(f"Shards written to {args.output}")


if __name__ == "__main__":
    main()
