#!/usr/bin/env python3
"""
Génère la base de données des codes postaux français avec coordonnées GPS.

Source: data.gouv.fr - Communes de France - Base des codes postaux
https://www.data.gouv.fr/fr/datasets/communes-de-france-base-des-codes-postaux/

Usage:
    python generate_postal_db.py

Output:
    src/postal_coords.js - Module JS avec la base de données
"""

import csv
import json
import urllib.request
import sys
import os
from collections import defaultdict

# URLs des sources de données
DATAGOUV_CSV_URL = "https://www.data.gouv.fr/fr/datasets/r/dbe8a621-a9c4-4bc3-9cae-be1699c5ff25"
GEO_API_URL = "https://geo.api.gouv.fr/communes?fields=codesPostaux,centre&format=json"


def download_from_datagouv():
    """Télécharge et parse le CSV de data.gouv.fr"""
    print("📥 Téléchargement depuis data.gouv.fr...")
    
    try:
        req = urllib.request.Request(
            DATAGOUV_CSV_URL,
            headers={'User-Agent': 'Mozilla/5.0 (postal-db-generator)'}
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read().decode('utf-8')
    except Exception as e:
        print(f"❌ Erreur de téléchargement: {e}")
        return None
    
    print("📊 Parsing du CSV...")
    
    lines = content.strip().split('\n')
    
    # Détecter le séparateur
    first_line = lines[0]
    separator = ';' if ';' in first_line else ','
    
    reader = csv.reader(lines, delimiter=separator)
    header = next(reader)
    header_lower = [h.lower().strip() for h in header]
    
    print(f"   Colonnes détectées: {header}")
    
    # Trouver les indices des colonnes
    cp_idx = None
    lat_idx = None
    lon_idx = None
    
    for i, h in enumerate(header_lower):
        if 'code_postal' in h or 'codepostal' in h or h == 'code postal':
            cp_idx = i
        elif 'latitude' in h:
            lat_idx = i
        elif 'longitude' in h:
            lon_idx = i
    
    if cp_idx is None or lat_idx is None or lon_idx is None:
        print(f"❌ Colonnes manquantes. Trouvé: cp={cp_idx}, lat={lat_idx}, lon={lon_idx}")
        return None
    
    print(f"   Indices: code_postal={cp_idx}, latitude={lat_idx}, longitude={lon_idx}")
    
    # Extraire les données
    postal_data = defaultdict(lambda: {'lats': [], 'lons': []})
    row_count = 0
    
    for row in reader:
        if len(row) <= max(cp_idx, lat_idx, lon_idx):
            continue
        
        code_postal = row[cp_idx].strip().zfill(5)
        lat_str = row[lat_idx].strip()
        lon_str = row[lon_idx].strip()

        # Valider le code postal (5 chiffres)
        if not code_postal or not code_postal.isdigit():
            continue
        
        try:
            lat = float(lat_str)
            lon = float(lon_str)
            
            if -180 <= lon <= 180 and -90 <= lat <= 90:
                postal_data[code_postal]['lats'].append(lat)
                postal_data[code_postal]['lons'].append(lon)
                row_count += 1
        except (ValueError, TypeError):
            continue
    
    print(f"   {row_count} lignes traitées")
    
    # Calculer les moyennes (plusieurs communes peuvent avoir le même code postal)
    result = {}
    for cp, data in postal_data.items():
        if data['lats'] and data['lons']:
            result[cp] = {
                'lat': sum(data['lats']) / len(data['lats']),
                'lon': sum(data['lons']) / len(data['lons'])
            }
    
    return result


def download_from_geo_api():
    """Alternative: télécharge depuis geo.api.gouv.fr"""
    print("📥 Téléchargement depuis geo.api.gouv.fr...")
    
    try:
        req = urllib.request.Request(
            GEO_API_URL,
            headers={'User-Agent': 'Mozilla/5.0 (postal-db-generator)'}
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            communes = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Erreur de téléchargement: {e}")
        return None
    
    print(f"📊 Traitement de {len(communes)} communes...")
    
    postal_data = defaultdict(lambda: {'lats': [], 'lons': []})
    
    for commune in communes:
        codes_postaux = commune.get('codesPostaux', [])
        centre = commune.get('centre', {})
        coords = centre.get('coordinates', [])
        
        if len(coords) == 2:
            lon, lat = coords  # GeoJSON = [lon, lat]
            for cp in codes_postaux:
                cp = cp.strip().zfill(5) if cp else ''
                if cp and cp.isdigit():
                    postal_data[cp]['lats'].append(lat)
                    postal_data[cp]['lons'].append(lon)
    
    result = {}
    for cp, data in postal_data.items():
        if data['lats'] and data['lons']:
            result[cp] = {
                'lat': sum(data['lats']) / len(data['lats']),
                'lon': sum(data['lons']) / len(data['lons'])
            }
    
    return result


def generate_js_module(data, output_file='src/postal_coords.js'):
    """Génère le module JS avec la base de données"""
    
    # Format compact: {"75001":[48.86,2.34],...}
    compact = {}
    for cp, d in sorted(data.items()):
        compact[cp] = [round(d['lat'], 4), round(d['lon'], 4)]
    
    js_content = f"""// Base de données des codes postaux français avec coordonnées GPS
// Généré depuis data.gouv.fr - {len(data)} codes postaux
// Format: {{"code_postal": [latitude, longitude]}}
// Licence: ODbL (Open Database License)

export const POSTAL_COORDS = {json.dumps(compact, separators=(',', ':'))};

/**
 * Récupère les coordonnées d'un code postal
 * @param {{string}} zipcode - Code postal à 5 chiffres
 * @returns {{{{lat: number, lon: number}}|null}} Coordonnées ou null si non trouvé
 */
export function getCoordinates(zipcode) {{
  const coords = POSTAL_COORDS[zipcode];
  if (coords) {{
    return {{ lat: coords[0], lon: coords[1] }};
  }}
  return null;
}}

/**
 * Vérifie si un code postal existe dans la base
 * @param {{string}} zipcode - Code postal à vérifier
 * @returns {{boolean}}
 */
export function hasZipcode(zipcode) {{
  return zipcode in POSTAL_COORDS;
}}

/**
 * Retourne le nombre de codes postaux dans la base
 * @returns {{number}}
 */
export function getDatabaseSize() {{
  return Object.keys(POSTAL_COORDS).length;
}}
"""
    
    # Créer le dossier si nécessaire
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    return output_file


def main():
    print("=" * 60)
    print("🇫🇷 Génération de la base des codes postaux français")
    print("=" * 60)
    print()
    
    # Essayer d'abord data.gouv.fr
    data = download_from_datagouv()
    
    # Si échec, essayer geo.api.gouv.fr
    if not data:
        print()
        print("⚠️  Échec avec data.gouv.fr, tentative avec geo.api.gouv.fr...")
        data = download_from_geo_api()
    
    if not data:
        print()
        print("❌ Impossible de récupérer les données.")
        print("   Vérifiez votre connexion internet.")
        sys.exit(1)
    
    print()
    print(f"✅ {len(data)} codes postaux récupérés")
    
    # Vérifier Monts (37260)
    if '37260' in data:
        monts = data['37260']
        print(f"   📍 Monts (37260): {monts['lat']:.4f}, {monts['lon']:.4f}")
    else:
        print("   ⚠️  Monts (37260) non trouvé!")
    
    # Quelques stats
    deps = set(cp[:2] for cp in data.keys())
    print(f"   📊 {len(deps)} départements couverts")
    
    # Générer le fichier JS
    print()
    print("📝 Génération du module JavaScript...")
    
    js_file = generate_js_module(data)
    js_size = os.path.getsize(js_file) / 1024
    
    print()
    print("=" * 60)
    print("✅ Génération terminée!")
    print("=" * 60)
    print(f"   📄 {js_file} ({js_size:.1f} KB)")
    print()
    print("Prochaine étape:")
    print("   Importez dans App.jsx:")
    print("   import { getCoordinates, POSTAL_COORDS } from './postal_coords';")
    print()


if __name__ == '__main__':
    main()
