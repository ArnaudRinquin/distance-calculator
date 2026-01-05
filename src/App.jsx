import React, { useState, useEffect } from 'react';
import { getCoordinates, POSTAL_COORDS } from './postal_coords';

// Coordonnées de Monts (37260) - ville de référence
const MONTS_ZIPCODE = '37260';
const MONTS_COORDS = getCoordinates(MONTS_ZIPCODE) || { lat: 47.2833, lon: 0.7833 };

// Formule de Haversine pour calculer la distance entre deux coordonnées
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Parser CSV (supporte ; et ,)
const parseCSV = (content) => {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const matches = line.match(/(".*?"|[^,;]+)(?=\s*[,;]|\s*$)/g);
    return matches ? matches.map(cell => cell.replace(/^"|"$/g, '').trim()) : [];
  });
};

// Générer CSV avec séparateur français
const generateCSV = (data, headers) => {
  const headerRow = headers.join(';');
  const dataRows = data.map(row => 
    row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(';') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(';')
  );
  return [headerRow, ...dataRows].join('\n');
};

// Téléchargement avec BOM UTF-8
const downloadCSV = (content, filename) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Icônes SVG
const Icons = {
  Upload: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Download: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  MapPin: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Database: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Home: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
};

export default function App() {
  const [step, setStep] = useState(1);
  const [processedData, setProcessedData] = useState([]);
  const [stats, setStats] = useState({ total: 0, unique: 0, found: 0, notFound: 0 });
  const [errors, setErrors] = useState([]);
  const [ratioRanges, setRatioRanges] = useState(() => {
    const saved = localStorage.getItem('ratioRanges');
    return saved ? JSON.parse(saved) : [
      { min: 0, max: 100, ratio: 1 },
      { min: 100, max: 200, ratio: 2 },
      { min: 200, max: 500, ratio: 3 }
    ];
  });
  const [defaultRatio, setDefaultRatio] = useState(() => {
    const saved = localStorage.getItem('defaultRatio');
    return saved ? JSON.parse(saved) : 5;
  });
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    localStorage.setItem('ratioRanges', JSON.stringify(ratioRanges));
  }, [ratioRanges]);

  useEffect(() => {
    localStorage.setItem('defaultRatio', JSON.stringify(defaultRatio));
  }, [defaultRatio]);

  const dbSize = Object.keys(POSTAL_COORDS).length;

  const processFile = (file) => {
    if (!file) return;
    
    setErrors([]);
    setProcessedData([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      // Ignorer l'en-tête si présent
      const dataRows = rows[0]?.[0]?.toLowerCase().includes('zip') || 
                       rows[0]?.[0]?.toLowerCase().includes('code') ? 
                       rows.slice(1) : rows;
      
      const uniqueZipcodes = [...new Set(dataRows.map(row => String(row[0]).padStart(5, '0')))];
      const notFoundCodes = [];
      
      // Traitement instantané
      const results = dataRows.map(row => {
        const [rawZipcode, cityName] = row;
        const zipcode = String(rawZipcode).padStart(5, '0');
        const coords = getCoordinates(zipcode);
        let distance = null;
        
        if (coords) {
          distance = calculateDistance(
            coords.lat, coords.lon,
            MONTS_COORDS.lat, MONTS_COORDS.lon
          );
        } else if (!notFoundCodes.includes(zipcode)) {
          notFoundCodes.push(zipcode);
        }
        
        return [zipcode, cityName || '', distance !== null ? distance.toFixed(2) : 'N/A'];
      });
      
      setStats({ 
        total: dataRows.length, 
        unique: uniqueZipcodes.length,
        found: uniqueZipcodes.length - notFoundCodes.length, 
        notFound: notFoundCodes.length 
      });
      setErrors(notFoundCodes.map(cp => ({ zipcode: cp, error: 'Code postal non trouvé' })));
      setProcessedData(results);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith('.csv')) {
      processFile(file);
    }
  };

  const downloadWithDistances = () => {
    const csv = generateCSV(processedData, ['Code_Postal', 'Ville', 'Distance_km']);
    downloadCSV(csv, 'villes_avec_distances.csv');
  };

  const getRatioForDistance = (distance) => {
    if (distance === 'N/A') return 'N/A';
    const d = parseFloat(distance);
    for (const range of ratioRanges) {
      if (d >= range.min && d < range.max) return range.ratio;
    }
    return defaultRatio;
  };

  const downloadWithRatios = () => {
    const dataWithRatios = processedData.map(row => {
      const ratio = getRatioForDistance(row[2]);
      const weighted = row[2] === 'N/A' || ratio === 'N/A' ? 'N/A' : (parseFloat(row[2]) * ratio).toFixed(2);
      return [...row, ratio, weighted];
    });
    const csv = generateCSV(dataWithRatios, ['Code_Postal', 'Ville', 'Distance_km', 'Coefficient', 'Distance_Ponderee']);
    downloadCSV(csv, 'villes_avec_coefficients.csv');
  };

  const updateRange = (index, field, value) => {
    const newRanges = [...ratioRanges];
    const numValue = parseFloat(value) || 0;
    newRanges[index] = { ...newRanges[index], [field]: numValue };
    
    if (field === 'max' && index < newRanges.length - 1) {
      newRanges[index + 1] = { ...newRanges[index + 1], min: numValue };
    }
    if (field === 'min' && index > 0) {
      newRanges[index - 1] = { ...newRanges[index - 1], max: numValue };
    }
    setRatioRanges(newRanges);
  };

  const addRange = () => {
    const last = ratioRanges[ratioRanges.length - 1];
    setRatioRanges([...ratioRanges, { min: last.max, max: last.max + 100, ratio: last.ratio + 1 }]);
  };

  const removeRange = (index) => {
    if (ratioRanges.length <= 1) return;
    const newRanges = [...ratioRanges];
    if (index === 0) newRanges[1].min = 0;
    else newRanges[index - 1].max = newRanges[index].max;
    newRanges.splice(index, 1);
    setRatioRanges(newRanges);
  };

  const hasGaps = () => {
    if (ratioRanges[0].min !== 0) return true;
    for (let i = 1; i < ratioRanges.length; i++) {
      if (ratioRanges[i].min !== ratioRanges[i - 1].max) return true;
    }
    return false;
  };

  const maxRange = ratioRanges[ratioRanges.length - 1]?.max || 0;

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: '#e2e8f0',
      padding: '40px 20px'
    },
    card: {
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: '24px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 20px',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    input: {
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
      fontFamily: "'JetBrains Mono', monospace",
      outline: 'none'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            padding: '8px 16px',
            borderRadius: '100px',
            marginBottom: '20px',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <Icons.MapPin />
            <span style={{ fontWeight: 500, fontSize: '14px', color: '#a5b4fc' }}>
              Référence : Monts {MONTS_ZIPCODE}
            </span>
          </div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 700,
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Calculateur de Distance
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0 }}>
            Calculez les distances à vol d'oiseau depuis les villes françaises vers Monts
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '12px',
            fontSize: '13px',
            color: '#64748b'
          }}>
            <Icons.Database />
            <span>{dbSize.toLocaleString()} codes postaux en base</span>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: step >= s ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                  color: step >= s ? '#fff' : '#64748b',
                  boxShadow: step >= s ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none'
                }}>
                  {step > s ? <Icons.Check /> : s}
                </div>
                {s < 3 && (
                  <div style={{
                    width: '60px',
                    height: '2px',
                    background: step > s ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '1px'
                  }} />
                )}
              </div>
            ))}
          </div>
          {step > 1 && (
            <button
              onClick={() => { setStep(1); setProcessedData([]); setErrors([]); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Icons.Home />
              Nouveau fichier
            </button>
          )}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div style={{ ...styles.card, padding: '60px' }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
              style={{
                border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '16px',
                padding: '60px',
                textAlign: 'center',
                background: dragOver ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              <input
                type="file"
                id="fileInput"
                accept=".csv"
                onChange={(e) => processFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <div style={{ color: dragOver ? '#6366f1' : '#64748b', marginBottom: '20px' }}>
                <Icons.Upload />
              </div>
              <p style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0', color: '#e2e8f0' }}>
                Déposez votre fichier CSV ici
              </p>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                ou cliquez pour parcourir • Format : code_postal, ville
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Results */}
        {step >= 2 && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0' }}>
                  Calcul des distances
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                  {stats.total} villes • {stats.found}/{stats.unique} codes trouvés
                  {stats.notFound > 0 && <span style={{ color: '#fb923c' }}> • {stats.notFound} non trouvés</span>}
                </p>
              </div>
              
              {processedData.length > 0 && (
                <button
                  onClick={downloadWithDistances}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Icons.Download />
                  Télécharger CSV
                </button>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div style={{
                background: 'rgba(251, 146, 60, 0.1)',
                border: '1px solid rgba(251, 146, 60, 0.3)',
                borderRadius: '12px',
                marginBottom: '24px',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'rgba(251, 146, 60, 0.1)',
                  borderBottom: '1px solid rgba(251, 146, 60, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icons.Alert />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#fdba74' }}>
                      {errors.length} code{errors.length > 1 ? 's postaux non trouvés' : ' postal non trouvé'}
                    </span>
                  </div>
                  <button onClick={() => setErrors([])} style={{ background: 'none', border: 'none', color: '#fb923c', cursor: 'pointer' }}>
                    <Icons.X />
                  </button>
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '12px 20px' }}>
                  {errors.slice(0, 20).map((err, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: i < Math.min(errors.length, 20) - 1 ? '1px solid rgba(251, 146, 60, 0.15)' : 'none',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '12px'
                    }}>
                      <span style={{ color: '#fdba74' }}>{err.zipcode}</span>
                    </div>
                  ))}
                  {errors.length > 20 && (
                    <p style={{ fontSize: '12px', color: '#fdba74', margin: '8px 0 0', textAlign: 'center' }}>
                      ... et {errors.length - 20} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Data preview */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#94a3b8' }}>Code Postal</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#94a3b8' }}>Ville</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#94a3b8' }}>Distance (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{row[0]}</td>
                      <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{row[1]}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: row[2] === 'N/A' ? '#ef4444' : '#10b981', fontWeight: 500 }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {processedData.length > 10 && (
                <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: 'rgba(255,255,255,0.02)' }}>
                  ... et {processedData.length - 10} lignes supplémentaires
                </div>
              )}
            </div>

            {step === 2 && processedData.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    ...styles.button,
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  Configurer les coefficients →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Ratios */}
        {step === 3 && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0' }}>Configuration des coefficients</h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Définissez les tranches de distance et leurs coefficients</p>
              </div>
              
              <button
                onClick={downloadWithRatios}
                disabled={hasGaps()}
                style={{
                  ...styles.button,
                  background: hasGaps() ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: hasGaps() ? '#64748b' : '#fff',
                  cursor: hasGaps() ? 'not-allowed' : 'pointer',
                  boxShadow: hasGaps() ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)'
                }}
              >
                <Icons.Download />
                Télécharger avec coefficients
              </button>
            </div>

            {hasGaps() && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 18px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                marginBottom: '24px',
                color: '#fca5a5',
                fontSize: '14px'
              }}>
                <Icons.Alert />
                <span>Les tranches doivent être continues à partir de 0.</span>
              </div>
            )}

            {/* Range list */}
            <div style={{ marginBottom: '24px' }}>
              {ratioRanges.map((range, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <span style={{ fontSize: '13px', color: '#64748b', minWidth: '60px' }}>Tranche {index + 1}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={range.min}
                      onChange={(e) => updateRange(index, 'min', e.target.value)}
                      disabled={index === 0}
                      style={{ ...styles.input, width: '80px', opacity: index === 0 ? 0.5 : 1 }}
                    />
                    <span style={{ color: '#64748b' }}>→</span>
                    <input
                      type="number"
                      value={range.max}
                      onChange={(e) => updateRange(index, 'max', e.target.value)}
                      style={{ ...styles.input, width: '80px' }}
                    />
                    <span style={{ color: '#64748b' }}>km</span>
                  </div>

                  <span style={{ color: '#64748b' }}>=</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Coef:</span>
                    <input
                      type="number"
                      value={range.ratio}
                      onChange={(e) => updateRange(index, 'ratio', e.target.value)}
                      step="0.1"
                      style={{ ...styles.input, width: '70px', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ flex: 1 }} />

                  <button
                    onClick={() => removeRange(index)}
                    disabled={ratioRanges.length <= 1}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: ratioRanges.length <= 1 ? '#374151' : '#ef4444',
                      cursor: ratioRanges.length <= 1 ? 'not-allowed' : 'pointer',
                      opacity: ratioRanges.length <= 1 ? 0.4 : 1
                    }}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRange}
              style={{
                ...styles.button,
                width: '100%',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px dashed rgba(255,255,255,0.2)',
                color: '#94a3b8',
                marginBottom: '24px'
              }}
            >
              <Icons.Plus />
              Ajouter une tranche
            </button>

            {/* Default ratio */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px 0' }}>Coefficient par défaut</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Pour les distances au-delà de {maxRange} km</p>
              </div>
              <input
                type="number"
                value={defaultRatio}
                onChange={(e) => setDefaultRatio(parseFloat(e.target.value) || 0)}
                step="0.1"
                style={{ ...styles.input, width: '80px', textAlign: 'center', fontSize: '16px', fontWeight: 600 }}
              />
            </div>

            {/* Totals */}
            {(() => {
              const validData = processedData.filter(row => row[2] !== 'N/A');
              const totalDistance = validData.reduce((sum, row) => sum + parseFloat(row[2]), 0);
              const totalWeighted = validData.reduce((sum, row) => {
                const ratio = getRatioForDistance(row[2]);
                return sum + parseFloat(row[2]) * ratio;
              }, 0);
              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginTop: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    padding: '20px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <p style={{ fontSize: '13px', color: '#6ee7b7', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total distances</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                      {totalDistance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km
                    </p>
                  </div>
                  <div style={{
                    padding: '20px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}>
                    <p style={{ fontSize: '13px', color: '#a5b4fc', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total pondéré</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#818cf8', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                      {totalWeighted.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Visualization */}
            <div style={{ marginTop: '32px' }}>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Visualisation
              </p>
              <div style={{ display: 'flex', height: '40px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                {ratioRanges.map((range, index) => {
                  const width = ((range.max - range.min) / (maxRange || 500)) * 100;
                  const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];
                  return (
                    <div
                      key={index}
                      style={{
                        width: `${width}%`,
                        background: colors[index % colors.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#000',
                        borderRight: index < ratioRanges.length - 1 ? '2px solid #0f172a' : 'none'
                      }}
                      title={`${range.min}-${range.max}km: ×${range.ratio}`}
                    >
                      {width > 10 && `×${range.ratio}`}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                <span>0 km</span>
                <span>{maxRange} km+</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
