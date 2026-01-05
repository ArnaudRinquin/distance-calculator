# Calculateur de Distance - Villes françaises vers Monts (37260)

Application React permettant de :
1. Importer un CSV avec des codes postaux et noms de villes français
2. Calculer la distance (à vol d'oiseau) vers Monts (37260)
3. Appliquer des coefficients personnalisés par tranches de distance
4. Exporter le résultat en CSV

## Architecture

```
distance-calculator/
├── README.md
├── package.json
├── generate_postal_db.py      # Script pour générer la base de coordonnées
├── src/
│   ├── App.jsx                # Application principale React
│   ├── postal_coords.js       # Base de données générée (~6300 codes postaux)
│   ├── index.jsx
│   └── index.css
├── public/
│   └── index.html
└── sample_cities.csv          # Fichier d'exemple pour tester
```

## Setup

### 1. Créer le projet React

```bash
npm create vite@latest distance-calculator -- --template react
cd distance-calculator
npm install
```

### 2. Générer la base de données des codes postaux

```bash
# Nécessite Python 3
python generate_postal_db.py
```

Cela génère `postal_coords.js` avec ~6300 codes postaux français et leurs coordonnées GPS.

### 3. Intégrer la base dans l'application

Copier `postal_coords.js` dans `src/` et l'importer dans `App.jsx`.

### 4. Lancer l'application

```bash
npm run dev
```

## Fonctionnalités

### Étape 1 : Import CSV
- Glisser-déposer ou sélection de fichier
- Format attendu : `code_postal;ville` ou `code_postal,ville`
- Détection automatique du séparateur (; ou ,)
- Ignore la ligne d'en-tête si présente

### Étape 2 : Calcul des distances
- Recherche instantanée dans la base embarquée (pas d'API externe)
- Distance à vol d'oiseau (formule de Haversine)
- Affichage des codes postaux non trouvés
- Export CSV disponible à cette étape

### Étape 3 : Configuration des coefficients
- Définition de tranches de distance (ex: 0-100km, 100-200km, etc.)
- Coefficient associé à chaque tranche
- Coefficient par défaut pour les distances au-delà
- Validation : pas de discontinuité entre les tranches
- Visualisation graphique des tranches
- Export CSV final avec coefficients

## Format des fichiers CSV

### Entrée
```csv
code_postal;ville
75001;Paris
69001;Lyon
37260;Monts
```

### Sortie (avec distances)
```csv
Code_Postal;Ville;Distance_km
75001;Paris;234.56
69001;Lyon;412.33
37260;Monts;0.00
```

### Sortie (avec coefficients)
```csv
Code_Postal;Ville;Distance_km;Coefficient
75001;Paris;234.56;3
69001;Lyon;412.33;5
37260;Monts;0.00;1
```

## Notes techniques

- **Base de données** : ~6300 codes postaux, ~150-200 KB en JSON minifié
- **Calcul de distance** : Formule de Haversine (distance orthodromique)
- **Précision** : Coordonnées arrondies à 4 décimales (~11m de précision)
- **Séparateur CSV** : Point-virgule (;) standard français, avec BOM UTF-8

## Source des données

Base officielle des codes postaux de La Poste, enrichie avec coordonnées GPS :
- https://www.data.gouv.fr/fr/datasets/communes-de-france-base-des-codes-postaux/
- Licence : ODbL (Open Database License)
