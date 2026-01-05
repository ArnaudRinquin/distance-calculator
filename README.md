# Calculateur de Distance vers Monts (37260)

**[Ouvrir l'application →](https://arnaud.rocks/distance-calculator/)**

Calcule la distance à vol d'oiseau entre des villes françaises et Monts (Indre-et-Loire).

## Fonctionnalités

1. Import CSV (code postal + ville)
2. Calcul instantané via base embarquée (~6300 codes postaux)
3. Coefficients configurables par tranches de distance
4. Export CSV

## Développement

```bash
pnpm install
pnpm dev
```

Pour régénérer la base de codes postaux :
```bash
python3 generate_postal_db.py
```

## Technique

- React + Vite
- Distance : formule de Haversine
- Base de données : [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/communes-de-france-base-des-codes-postaux/) (ODbL)
- 100% client-side, pas d'API externe
