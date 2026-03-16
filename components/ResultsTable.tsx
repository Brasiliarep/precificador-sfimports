import React, { useState, useEffect } from 'react';
import { DashboardRow, GlobalSettings, StoreProduct } from '../types';
import { Download, Printer, Link as LinkIcon, Search, Trash2, Unlink, AlertCircle, CheckCircle, ExternalLink, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getImagemLocalPrecificador } from '../utils/imageUtils';
import { parseMoney } from '../utils/moneyUtils';
import { lerCache } from '../src/inteligenciaService';

// ─── BASE DE PONTUAÇÕES MÁXIMAS HISTÓRICAS ────────────────────────────────────
const SCORES_DB: Record<string, { WA?: string; JS?: string; WS?: string; Desc?: string; Tim?: string; Viv?: string }> = {
  'VINHO TINTO ALMA VIVA': { WA: '98', JS: '98', WS: '97', Desc: '97', Viv: '4.6' },
  'VINHO TT DON MELCHOR 2021': { WA: '97', JS: '97', WS: '95', Viv: '4.4' },
  'VINHO TINTO PURPLE ANGEL': { WA: '96', JS: '97', WS: '95', Desc: '94', Viv: '4.3' },
  'VINHO TT CHADWICK': { WA: '100', JS: '100', WS: '97', Desc: '97', Viv: '4.7' },
  'VINHO TINTO CLOS APALTA': { WA: '98', JS: '100', WS: '97', Desc: '97', Viv: '4.5' },
  'VINHO TT SEÑA': { WA: '97', JS: '98', WS: '96', Desc: '96', Viv: '4.4' },
  'VINHO TT ROCAS DE SEÑA': { WA: '94', JS: '95', WS: '93', Viv: '4.1' },
  'CARMIN DE PEUMO CARMENERE': { WA: '96', JS: '96', WS: '94', Viv: '4.2' },
  'MARQUES CASA CONCHA CABERNET SAUVIGNON': { WA: '93', JS: '94', WS: '92', Viv: '3.9' },
  'MARQUES CASA CONCHA CARMENERE': { WA: '93', JS: '94', WS: '92', Viv: '3.9' },
  'MARQUES CASA CONCHA MALBEC': { WA: '93', JS: '93', WS: '91', Viv: '3.9' },
  'MARQUES DE CASA CONCHA MERLOT': { WA: '93', JS: '93', WS: '91', Viv: '3.9' },
  'MONTES ALPHA CABERNET SAUVIGNON': { WA: '93', JS: '93', WS: '92', Viv: '3.8' },
  'VINHO BRANCO MONTES ALPHA SAUVIGNON BLANC': { WA: '92', JS: '93', WS: '91', Viv: '3.8' },
  'MONTES ALPHA CABERNET ED ESPECIAL CUVEE': { WA: '94', JS: '94', WS: '93', Viv: '3.9' },
  'VINHO TINTO ESCUDO ROJO': { WA: '92', JS: '93', WS: '91', Viv: '3.8' },
  'VINHO TINTO ESCUDO ROJO BARONESA': { WA: '93', JS: '94', WS: '92', Viv: '3.9' },
  'VIK "A" CARMENERE': { WA: '96', JS: '96', WS: '94', Viv: '4.2' },
  'VINHO TINTO VIK CABERNET SAUVIGNON': { WA: '95', JS: '96', WS: '94', Viv: '4.1' },
  'VINHO TINTO VIK A CABERNET SAUVIGNON 750ML': { WA: '95', JS: '96', WS: '94', Viv: '4.1' },
  'VINHO TINTO VIK MILLA CALA': { WA: '95', JS: '95', WS: '93', Viv: '4.0' },
  'VINHO TINTO LA PIU BELLE': { WA: '93', JS: '93', WS: '91', Viv: '3.9' },
  'VINHNO CHILENO VIK LA PIU BELLE ROSE': { WA: '93', JS: '93', WS: '91', Viv: '3.9' },
  'VINHO TINTO SIDERAL': { WA: '94', JS: '94', WS: '93', Viv: '4.0' },
  'VINHO TT CABO DE HORNOS': { WA: '95', JS: '96', WS: '94', Viv: '4.1' },
  'CABALLO LOCO GRAN CRU NUMBER 21': { WA: '95', JS: '95', WS: '94', Desc: '93', Viv: '4.1' },
  'CABALLO LOCO GRAN CRU SAGRADA FAMILIA': { WA: '94', JS: '94', WS: '93', Viv: '4.0' },
  'VINHO CABALLO LOCO GRAND CRU PIRQUE': { WA: '94', JS: '94', WS: '93', Viv: '4.0' },
  'VINHO CABALLO LOCO GRAND APALTA': { WA: '96', JS: '97', WS: '95', Viv: '4.2' },
  'VINHO TINTO EPU': { WA: '93', JS: '93', WS: '91', Viv: '3.8' },
  'VINHO TINTO EPU 2021': { WA: '93', JS: '93', WS: '91', Viv: '3.8' },
  'VINHO TT VON SIEBENTHAL PARCELA #7': { WA: '96', JS: '96', WS: '95', Desc: '95', Viv: '4.2' },
  'VINHO TT VON SIEBENTHAL CARABANTES': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'VINHO TT MAYA CABERNET SAUVIGNON': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'VINHO TT MAYA CARMENERE RESERVA': { WA: '93', JS: '93', WS: '92', Viv: '3.9' },
  'CASAS DEL TOQUI LEYENDA': { WA: '94', JS: '94', WS: '93', Viv: '4.0' },
  'VINHO TT CATENA ZAPATA MALBEC': { WA: '100', JS: '98', WS: '97', Desc: '97', Viv: '4.5' },
  'VINHO TT PARCELA NICOLA CATENA': { WA: '98', JS: '98', WS: '96', Viv: '4.4' },
  'VINHO TT CATENA APPELLATION LUNLUNTA MALBEC': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VINHO TINTO CATENA ALTA CABERNET SAUVIGNON': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'D.V CATENA MALBEC MALBEC': { WA: '93', JS: '93', WS: '92', Viv: '3.9' },
  'ANGELICA ZAPATA MALBEC': { WA: '97', JS: '97', WS: '96', Viv: '4.3' },
  'ANGELICA ZAPATA CHARDONNAY': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'GRAN ENEMIGO GUALTALLARY': { WA: '97', JS: '97', WS: '96', Desc: '96', Viv: '4.3' },
  'VINHO TT AMANCAYA': { WA: '93', JS: '93', WS: '92', Viv: '3.9' },
  'BRAMARE LUJAN DE CUYO': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VINHO TINTO CLOS DE LOS SIETE': { WA: '95', JS: '95', WS: '94', Desc: '94', Viv: '4.1' },
  'VINHO TINTO CHEVAL DES ANDES': { WA: '97', JS: '97', WS: '96', Desc: '96', Viv: '4.4' },
  'VINHO TT LUIGI BOSCA MALBEC DE SANDRE': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VINHO TT NORTON RESERVA MALBEC': { WA: '92', JS: '92', WS: '91', Viv: '3.8' },
  'VINHO TINTO ISCAY MALBEC': { WA: '94', JS: '94', WS: '93', Viv: '4.0' },
  'VINHO TT APARTADO': { WA: '94', JS: '94', WS: '93', Viv: '4.0' },
  'VINHO TINTO SUSANA BALDO TRADICION MALBEC': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'ANTINORI TIGNANELLO': { WA: '98', JS: '98', WS: '96', Desc: '97', Viv: '4.4' },
  'VINHO TT SASSICAIA SAFRA 2021': { WA: '97', JS: '97', WS: '96', Desc: '97', Viv: '4.4' },
  'VINHO TINTO SASSIACAIA SAFRA 2019': { WA: '100', JS: '99', WS: '98', Desc: '98', Viv: '4.5' },
  'ORNELLAIA': { WA: '99', JS: '99', WS: '98', Desc: '98', Viv: '4.5' },
  "LE SERRE NUOVE DELL'ORNELLAIA": { WA: '95', JS: '96', WS: '94', Viv: '4.2' },
  "LE VOLTE DELL'ORNELLAIA": { WA: '92', JS: '93', WS: '91', Viv: '3.9' },
  'ORNELLAIA DOUBLE MAGNUM': { WA: '99', JS: '99', WS: '98', Viv: '4.5' },
  'POGGIO ALLE GAZZE DELL\'ORNELLAIA': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'VINHO TT LE SERRE NUOVE DELL ORNELLAIA': { WA: '95', JS: '96', WS: '94', Viv: '4.2' },
  'VINHO TT LE VOLTE DELL ORNELLAIA': { WA: '92', JS: '93', WS: '91', Viv: '3.9' },
  'VINHO TINTO SOLAIA RESERVA 1990': { WA: '99', JS: '100', WS: '98', Viv: '4.7' },
  'VINHO TINTO SOLAIA RESERVA 1988': { WA: '100', JS: '100', WS: '99', Viv: '4.8' },
  'BISERNO': { WA: '97', JS: '97', WS: '96', Viv: '4.3' },
  'IL PINO DI BISERNO': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'LODOVICO': { WA: '98', JS: '98', WS: '97', Viv: '4.4' },
  'VIETTI BAROLO CASTIGLIONE DOCG DOCG 90WS': { WA: '98', JS: '98', WS: '97', Desc: '97', Viv: '4.5' },
  'VINHO TT VIETTI BARBARESCO RONCAGILIE MASSERIA': { WA: '97', JS: '97', WS: '96', Viv: '4.4' },
  'BARBARESCO ASILI RISERVA': { WA: '99', JS: '99', WS: '98', Viv: '4.6' },
  'BAROLO DOCG  PERCRISTINA': { WA: '100', JS: '100', WS: '99', Viv: '4.8' },
  'BAROLO DOCG MONVIGLIERO RISERVA': { WA: '99', JS: '99', WS: '98', Viv: '4.6' },
  'BRUNELLO DI MONTALCINO RISERVA': { WA: '100', JS: '100', WS: '99', Viv: '4.7' },
  'BRUNELLO DI MONTALCINO': { WA: '99', JS: '99', WS: '98', Viv: '4.5' },
  'VINHO TT BRUNELLO BANFI': { WA: '97', JS: '97', WS: '96', Viv: '4.3' },
  'VINHO TT SOLENGO': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VINHO TINTO EDIZIONE CINQUE AUTOCTONI': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'VINHO TINTO PERA MANCA': { WA: '97', JS: '96', Desc: '97', Tim: '96', Viv: '4.4' },
  'VINHO BRANCO PERA MANCA': { WA: '96', JS: '95', Desc: '96', Tim: '95', Viv: '4.2' },
  'QUINTA DO CRASTO RESERVA VINHAS VELHAS TTO 750 ML': { WA: '96', JS: '96', Desc: '96', Tim: '95', Viv: '4.2' },
  'VINHO TINTO PINTAS DOURO': { WA: '96', JS: '96', Desc: '96', Tim: '95', Viv: '4.3' },
  'VINHO TINTO CARTUXA RESERVA': { WA: '94', JS: '94', Desc: '93', Viv: '4.0' },
  'VINHO DO PORTO BURMESTER 20': { WA: '94', JS: '94', Viv: '4.0' },
  'VINHO DO PORTO BURMESTER 30': { WA: '96', JS: '96', Viv: '4.2' },
  'VINHO DO PORTO TAYLOR 20': { WA: '95', JS: '95', Viv: '4.1' },
  'VINHO DO PORTO TAYLOR 30': { WA: '97', JS: '97', Viv: '4.3' },
  'VEGA SICILLIA UNICO 2010': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.9' },
  'VEGA SICILIA RIBERA DEL DUERO DO VALBUENA 5° 2018': { WA: '96', JS: '96', WS: '95', Viv: '4.3' },
  'ALIÓN RIBERA DEL DUERO D.O 2017': { WA: '96', JS: '96', WS: '95', Viv: '4.3' },
  'VINHO TT MACAN': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VINHO TT PINTIA': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VIÑA TONDONIA GRAN RESERVA': { WA: '98', JS: '97', WS: '97', Desc: '98', Viv: '4.5' },
  'VINHO TT CASTILLO YGAY RIOJA': { WA: '98', JS: '98', WS: '98', Desc: '98', Viv: '4.5' },
  'VINHO TT GAUDIUM': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'VINHO TINTO CLIO': { WA: '97', JS: '97', WS: '96', Viv: '4.3' },
  'VINHO TT FLOR DE PINGUS': { WA: '99', JS: '99', Desc: '99', Viv: '4.6' },
  'CHATEAU MARGAUX 1982': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  'CHATEAU MARGAUX': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  'PAVILLON ROUGE DU CHATEAU MARGAUX': { WA: '97', JS: '97', WS: '96', Viv: '4.3' },
  'CHATEAU HAUT BRION': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.8' },
  'LE CLARENCE DE HAUT BRION': { WA: '96', JS: '97', WS: '95', Viv: '4.3' },
  'CHATEAU LYNCH BAGES': { WA: '100', JS: '98', WS: '98', Desc: '97', Viv: '4.5' },
  'ECHO DE LYNCH BAGES': { WA: '92', JS: '92', WS: '91', Viv: '4.0' },
  'CHATEAU PICHON LONGUEVILLE COMTESSE DE LALANDE': { WA: '100', JS: '99', WS: '99', Desc: '99', Viv: '4.7' },
  'RESERVE DE LA COMTESSE': { WA: '93', JS: '94', WS: '93', Viv: '4.1' },
  'CHATEAU MONTROSE': { WA: '100', JS: '99', WS: '99', Desc: '99', Viv: '4.6' },
  'LA DAME DE MONTROSE': { WA: '93', JS: '93', WS: '92', Viv: '4.1' },
  'CHATEAU DUCRU BEAUCAILLOU': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.7' },
  'LA CROIX DUCRU-BEAUCAILLOU': { WA: '94', JS: '95', WS: '93', Viv: '4.1' },
  'CHATEAU PALMER': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.8' },
  'CHATEAU ANGELUS': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.8' },
  'LE CARILLON D ANGELUS': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'CHATEAU FIGEAC': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.6' },
  'CHATEAU PONTET CANET': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.6' },
  "CHATEAU L'EVANGILE": { WA: '100', JS: '99', WS: '98', Desc: '97', Viv: '4.5' },
  "BLASON DE L'EVANGILE": { WA: '92', JS: '93', WS: '91', Viv: '4.0' },
  'CHATEAU LEOVILLE BARTON': { WA: '98', JS: '98', WS: '97', Desc: '97', Viv: '4.4' },
  'GRAND VIN DE LEOVILLE DU MARQUIS DE LAS CASES': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  'CLOS DU MARQUIS': { WA: '95', JS: '96', WS: '94', Viv: '4.2' },
  'CHATEAU GRUAUD LAROSE': { WA: '100', JS: '98', WS: '97', Desc: '96', Viv: '4.4' },
  'LES FORTS DE LATOUR': { WA: '97', JS: '97', WS: '96', Desc: '96', Viv: '4.4' },
  "CHATEAU D'YQUEM": { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  "CHATEAU D'YQUEM HALF BOTTLE": { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  "Y D'YQUEM": { WA: '94', JS: '94', WS: '93', Viv: '4.1' },
  'CHATEAU RIEUSSEC': { WA: '100', JS: '98', WS: '98', Desc: '98', Viv: '4.4' },
  'CHATEAU SUDUIRAUT': { WA: '100', JS: '99', WS: '99', Desc: '99', Viv: '4.5' },
  'CHATEAU CLIMENS': { WA: '100', JS: '100', WS: '100', Desc: '99', Viv: '4.6' },
  'CHATEAU COUTET': { WA: '97', JS: '97', WS: '96', Desc: '96', Viv: '4.3' },
  'CHATEAU TALBOT': { WA: '98', JS: '97', WS: '97', Desc: '96', Viv: '4.3' },
  'CHATEAU CANON': { WA: '99', JS: '99', WS: '99', Desc: '99', Viv: '4.5' },
  'CHATEAU CALON SEGUR': { WA: '98', JS: '98', WS: '97', Desc: '97', Viv: '4.4' },
  'CHATEAU GAZIN': { WA: '97', JS: '97', WS: '96', Desc: '95', Viv: '4.3' },
  'CHATEAU BRANAIRE-DUCRU': { WA: '97', JS: '97', WS: '96', Desc: '96', Viv: '4.2' },
  'CHATEAU GISCOURS': { WA: '95', JS: '95', WS: '94', Desc: '94', Viv: '4.2' },
  'CHATEAU GLORIA': { WA: '95', JS: '95', WS: '94', Desc: '93', Viv: '4.1' },
  'CHATEAU SOCIANDO-MALLET': { WA: '97', JS: '96', WS: '96', Desc: '95', Viv: '4.2' },
  'DOMAINE DE CHEVALIER': { WA: '98', JS: '98', WS: '97', Desc: '97', Viv: '4.4' },
  'CHATEAU LA FLEUR DE BOUARD': { WA: '97', JS: '97', WS: '96', Desc: '95', Viv: '4.2' },
  "CHATEAU L'EGLISE CLINET": { WA: '100', JS: '99', WS: '98', Desc: '98', Viv: '4.7' },
  'CHATEAU LES CARMES HAUT-BRION': { WA: '100', JS: '99', WS: '98', Desc: '98', Viv: '4.7' },
  'CHATEAU BEAU-SEJOUR BECOT MAGNUM': { WA: '100', JS: '99', WS: '98', Viv: '4.6' },
  'LES PAGODES DE COS': { WA: '95', JS: '95', WS: '94', Viv: '4.1' },
  'RICHEBOURG': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  'CHAMBERTIN CLOS DE BEZE GRAND GRU': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '4.9' },
  'BONNES MARES GRAND CRU': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.8' },
  'CORTON CHARLEMAGNE GRAND CRU': { WA: '100', JS: '99', WS: '99', Desc: '98', Viv: '4.6' },
  'BATARD MONTRACHET GRAND CRU': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.7' },
  'CHAMPAGNE DOM PERIGNON BRUT 750': { WA: '100', JS: '100', WS: '99', Desc: '99', Viv: '4.7' },
  'CHAMPAGNE VEUVE CLICQUOT BRUT': { WA: '96', JS: '96', WS: '95', Viv: '4.2' },
  'CHAMPAGNE TAITTINGER PRESTIGE 750 ML': { WA: '94', JS: '94', WS: '93', Viv: '4.1' },
  'CHAMPGNE RUIMART BLANC DE BLANC': { WA: '97', JS: '97', WS: '96', Viv: '4.3' },
  'VINHO TT OPUS ONE 2017': { WA: '99', JS: '98', WS: '97', Desc: '97', Viv: '4.5' },
  'VINHO TT VIN PENFOLDS GRANGE BIN 95 1982': { WA: '100', JS: '100', WS: '100', Desc: '100', Viv: '5.0' },
  'WISKY MACALLAN 18 ANOS DOUBLE CASK': { WA: '94', Viv: '4.4' },
  'WHISKY HIBIKI HARMONY JAPANESE': { WA: '95', Viv: '4.4' },
  'WHISKY JOHNNIE WALKER BLUE LABEL L 750 ML': { WA: '95', Viv: '4.4' },
};

function lookupScoreRT(nome: string) {
  if (!nome) return null;
  const upper = nome.toUpperCase().trim();
  if (SCORES_DB[upper]) return SCORES_DB[upper];
  const keys = Object.keys(SCORES_DB);
  const match = keys.find(k => upper.includes(k) || k.includes(upper));
  return match ? SCORES_DB[match] : null;
}

function scoreColorRT(v?: string): string {
  if (!v) return '#9ca3af';
  const n = parseFloat(v);
  if (n >= 98) return '#f59e0b';
  if (n >= 95) return '#f97316';
  if (n >= 92) return '#22c55e';
  if (n >= 89) return '#16a34a';
  return '#9ca3af';
}
function vivColorRT(v?: string): string {
  if (!v) return '#9ca3af';
  const n = parseFloat(v);
  if (n >= 4.5) return '#f59e0b';
  if (n >= 4.2) return '#f97316';
  if (n >= 4.0) return '#22c55e';
  if (n >= 3.8) return '#16a34a';
  return '#9ca3af';
}

function getScoreBadgeGradient(row: any) {
  const s = lookupScoreRT(row.supplierName) || {
    Viv: row.vivinoRating, WA: row.parkerScore, JS: row.sucklingScore,
    WS: row.wspectatorScore, Desc: row.decanterScore, Tim: row.timAtkinScore
  };

  const v = parseFloat(s.Viv) || 0;
  const max = Math.max(
    parseFloat(s.WA) || 0, parseFloat(s.JS) || 0, parseFloat(s.WS) || 0,
    parseFloat(s.Desc) || 0, parseFloat(s.Tim) || 0
  );

  if (max >= 98 || v >= 4.5) return 'linear-gradient(135deg, #FFDF00, #D4AF37)'; // 🥇 Ouro
  if (max >= 95 || v >= 4.2) return 'linear-gradient(135deg, #F59E0B, #D97706)'; // 🟠 Âmbar
  if (max >= 92 || v >= 4.0) return 'linear-gradient(135deg, #4ADE80, #22C55E)'; // 🟢 Verde
  if (max >= 89 || v >= 3.8) return 'linear-gradient(135deg, #16A34A, #15803D)'; // 🌿 Verde Escuro

  return 'linear-gradient(135deg, #1a1400, #2e2400)'; // Padrão
}

// ─────────────────────────────────────────────────────────────────────────────

// Função para extrair ID do nome
const extractId = (nome: string): string | null => {
  const match = nome.match(/\|\s*(\d+)/);
  return match ? match[1].trim() : null;
};

// Função para limpar nome do produto
const cleanProductName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sà-ú]/g, '')
    .replace(/\b(vinho|wine|750ml|garrafa|taça|copo|fl|fr|ml|cl)\b/g, '')
    .trim();
};

// Função download CSV
const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Função para formatar moeda (BLINDADA)
const formatCurrency = (val: any): string => {
  const numValue = Number(val) || 0;
  return `R$${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// =========================
// HELPERS DE ORIGEM (Sincronizados com SFImportsModule)
// =========================

const isRowMistral = (row: Partial<DashboardRow>) => {
  return Boolean(
    row?.hasMistral ||
    Number(row?.mistralPrice || 0) > 0 ||
    row?.isMistral === true
  );
};

const getSourceVisual = (row: Partial<DashboardRow>) => {
  const hasSF = Boolean(row?.hasSF);
  const hasMilao = Boolean(row?.hasMilao);
  const hasMistral = isRowMistral(row);

  return (
    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
      {hasMistral && (
        <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider shadow-sm flex items-center gap-1">
          🍷 Mistral
        </span>
      )}
      {hasSF && hasMilao && (
        <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider shadow-sm flex items-center gap-1">
          📦 SF Imports
        </span>
      )}
      {hasMilao && (
        <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider shadow-sm flex items-center gap-1">
          🚛 Milão
        </span>
      )}
    </div>
  );
};

interface ResultsTableProps {
  rows: DashboardRow[];
  settings: GlobalSettings;
  viewMode: 'RETAIL' | 'B2B';
  onUpdateRow?: (rowId: string, updates: any) => void;
  onLinkProduct?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  onConverterMilao?: (row: DashboardRow) => void;
  onToggleSelecao?: (rowId: string) => void;
  produtosSelecionados?: string[];
  onConverterTodos?: () => void;
  excluirMilao?: (id: string) => void;
  vincularSfMilao?: (sfId: string, milaoId: string) => void;
  abrirVinculo?: (milaoId: string) => void;
  desvincularProduto?: (rowId: string) => void;
  onAplicarConfiguracoes?: () => void;
  storeCatalog?: any[];
  lucroMin?: string;
  showNotification?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onAplicarTodosAlertas?: () => void;
  onRegistrarCompra?: (compra: any) => void;
  mlPrecos?: any[];
  onSyncML?: () => void;
  isSyncingML?: boolean;
  onConfirmRevised?: (rowId: string) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  rows,
  settings,
  viewMode,
  onUpdateRow,
  onLinkProduct,
  onDeleteRow,
  onConverterMilao,
  onToggleSelecao,
  produtosSelecionados = [],
  onConverterTodos,
  storeCatalog,
  lucroMin,
  onAplicarTodosAlertas,
  onAplicarConfiguracoes,
  showNotification,
  onRegistrarCompra,
  mlPrecos = [],
  onSyncML,
  isSyncingML = false,
  onConfirmRevised
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localRows, setLocalRows] = useState<DashboardRow[]>([]);
  const [filtroOportunidades, setFiltroOportunidades] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedRowForLink, setSelectedRowForLink] = useState(null);
  const [termoBuscaMilao, setTermoBuscaMilao] = useState('');
  // Cache de inteligência competitiva (Vivino + SuperAdega)
  const [intelCache, setIntelCache] = useState<Record<string, any>>({});

  useEffect(() => {
    const lerCache = () => {
      try {
        const raw = localStorage.getItem('sf_inteligencia_cache');
        if (raw) setIntelCache(JSON.parse(raw));
      } catch { }
    };
    lerCache();
    // Atualiza a cada 15 segundos enquanto a fila silenciosa processa
    const interval = setInterval(lerCache, 15000);
    return () => clearInterval(interval);
  }, []);

  const [mlExpandido, setMlExpandido] = useState<string | null>(null);

  // ── MODAL DE PONTUAÇÕES 🏆 ──
  const [scoresModal, setScoresModal] = useState<{ aberto: boolean; nome: string; saPrice?: number }>({
    aberto: false, nome: '', saPrice: undefined,
  });

  const getMlData = (row: DashboardRow) => {
    return mlPrecos.find(m => m.produto_id === (row.id || row.rowId));
  };

  // Estado para modal de vinculação manual
  const [modalVinculacao, setModalVinculacao] = useState({
    aberto: false,
    produtoSF: null,
    produtosMilao: []
  });

  // Estado Modal Defasagem (Correção 3)
  const [modalDefasagem, setModalDefasagem] = useState({
    aberto: false,
    row: null as DashboardRow | null,
    custoVelho: 0,
    custoReal: 0,
    sugestaoPor: 0,
    prejuizo: 0
  });

  // Estado para modal de edição de imagem
  const [modalImagem, setModalImagem] = useState({
    aberto: false,
    rowId: '',
    url: ''
  });
  const [isDragging, setIsDragging] = useState(false);

  // MÓDULO 5 — ESTADO MODAL ML
  const [modalML, setModalML] = useState({
    aberto: false,
    produto: null as DashboardRow | null
  });

  // Funções para busca e upload de imagens
  const handleWebSearch = (productName: string) => {
    const query = encodeURIComponent(`${productName} sfimports produto`);
    window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
  };

  const handleFileUpload = async (file: File, rowId: string, supplierName: string) => {
    if (!file.type.startsWith('image/')) {
      showNotification?.('❌ Por favor, selecione uma imagem válida.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const response = await fetch('/api/upload-image-base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: cleanProductName(supplierName).replace(/\s+/g, '-'),
            imageBase64: base64
          })
        });

        const data = await response.json();
        if (data.success) {
          onUpdateRow?.(rowId, { image: data.path });
          setModalImagem(prev => ({ ...prev, url: data.path }));
          showNotification?.('✅ Imagem enviada e salva com sucesso!', 'success');
        } else {
          showNotification?.('❌ Erro ao salvar imagem no servidor.', 'error');
        }
      } catch (err) {
        showNotification?.('❌ Falha na comunicação com o servidor.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async (rowId: string, currentUrl: string, supplierName: string) => {
    if (!currentUrl) {
      showNotification?.('❌ Nenhuma imagem selecionada.', 'error');
      return;
    }

    showNotification?.('⏳ Removendo fundo, aguarde...', 'info');

    try {
      // Remover domínio localhost se existir na URL para o backend tratar como local
      let relativeUrl = currentUrl;
      if (currentUrl.includes('localhost:')) {
        relativeUrl = currentUrl.replace(/^https?:\/\/localhost:\d+/i, '');
      }

      // O endpoint /api/removebg é GET e requer ?image_url=
      const response = await fetch(`/api/removebg?image_url=${encodeURIComponent(relativeUrl)}`);

      if (!response.ok) {
        throw new Error('Falha ao remover fundo');
      }

      // Tenta ler como json primeiro (se der erro da API RemoveBG)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        showNotification?.(`❌ Erro RemoveBG: ${errorData.error || 'Desconhecido'}`, 'error');
        return;
      }

      const blob = await response.blob();

      // Converte Blob para Base64 para usar nossa API de upload existente
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;

        try {
          const uploadResponse = await fetch('/api/upload-image-base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: cleanProductName(supplierName).replace(/\s+/g, '-'),
              imageBase64: base64data
            })
          });

          const uploadData = await uploadResponse.json();
          if (uploadData.success) {
            // Adiciona timestamp para forçar reload no preview
            const newUrl = `${uploadData.path}?t=${new Date().getTime()}`;
            onUpdateRow?.(rowId, { image: newUrl });
            setModalImagem(prev => ({ ...prev, url: newUrl }));
            showNotification?.('✨ Fundo removido e salvo com sucesso!', 'success');
          } else {
            showNotification?.('❌ Erro ao salvar imagem sem fundo.', 'error');
          }
        } catch (err) {
          showNotification?.('❌ Erro no upload da imagem sem fundo.', 'error');
        }
      };
      reader.readAsDataURL(blob);

    } catch (err: any) {
      console.error(err);
      showNotification?.(`❌ Erro: ${err.message}`, 'error');
    }
  };

  // Funções de exportação
  const exportarWooCommerce = () => {
    const produtosWoo = rows.filter(row => row.storeProduct && row.storeProduct.id);

    if (produtosWoo.length === 0) {
      if (showNotification) showNotification('❌ Nenhum produto com ID do WooCommerce!', 'error');
      else alert('❌ Nenhum produto com ID do WooCommerce!');
      return;
    }

    const csvLines = [
      'ID,Tipo,SKU,Nome,Publicado,Preço promocional,Preço,Categorias,Imagens', // Headers mínimos
      ...produtosWoo.map(row => {
        const id = row.storeProduct.id;
        const nome = `"${row.supplierName.replace(/"/g, '""')}"`;
        const sku = row.storeProduct.id; // ou gerar SKU
        const sfPor = (row.sfPor || 0).toFixed(2).replace('.', ',');
        const sfDe = (row.sfDe || 0).toFixed(2).replace('.', ',');

        return `${id},simple,${sku},${nome},1,${sfPor},${sfDe},"Extra Premium, Tinto, Todos Produtos",[URL_DA_IMAGEM]`;
      })
    ].join('\n');

    downloadCSV(csvLines, `woocommerce-sfimports-${new Date().toISOString().split('T')[0]}.csv`);
    const msg = `✅ ${produtosWoo.length} produtos exportados!\n📥 WooCommerce > Produtos > Importar`;
    if (showNotification) showNotification(msg, 'success');
    else alert(msg);
  };

  const exportarRelatorio = () => {
    const csvLines = [
      'Status,Produto,Milão De,Milão Por,SF De,SF Por,Sugestão,Lucro,Status',
      ...rows.map(row => {
        return [
          row.status || 'MILÃO ONLY',
          `"${row.supplierName}"`,
          (row.milaoDe || 0).toFixed(2).replace('.', ','),
          (row.milaoPor || 0).toFixed(2).replace('.', ','),
          (row.sfDe || 0).toFixed(2).replace('.', ','),
          (row.sfPor || 0).toFixed(2).replace('.', ','),
          (row.sfSug || 0).toFixed(2).replace('.', ','),
          (row.lucroReal || 0).toFixed(2).replace('.', ','),
          row.status || '?'
        ].join(',');
      })
    ].join('\n');

    downloadCSV(csvLines, `relatorio-sfimports-${new Date().toISOString().split('T')[0]}.csv`);
    const msg = `✅ Relatório de ${rows.length} produtos exportado!`;
    if (showNotification) showNotification(msg, 'success');
    else alert(msg);
  };

  // Funções de vinculação manual
  const abrirVinculacaoManual = async (produtoSF) => {
    // Buscar TODOS produtos Milão (both + milao-only)
    const milaoDisponiveis = localRows.filter(r =>
      r.milaoDe && r.milaoPor
    );

    setModalVinculacao({
      aberto: true,
      produtoSF: produtoSF,
      produtosMilao: milaoDisponiveis
    });
  };

  const vincularProduto = (produtoSF, produtoMilao) => {
    // Atualizar o produto SF com preços do Milão
    const novoProduto = {
      ...produtoSF,
      milaoDe: produtoMilao.milaoDe,
      milaoPor: produtoMilao.milaoPor,
      status: 'both',
      isLinked: true
    };

    // Recalcular lucro e margem
    novoProduto.finalCost = produtoMilao.milaoPor;
    novoProduto.profit = novoProduto.sfPor - produtoMilao.milaoPor;
    novoProduto.margin = ((novoProduto.sfPor - produtoMilao.milaoPor) / novoProduto.sfPor) * 100;

    // Atualizar rows
    setLocalRows(prev => prev.map(r =>
      r.rowId === produtoSF.rowId ? novoProduto : r
    ));

    // Fechar modal
    setModalVinculacao({ aberto: false, produtoSF: null, produtosMilao: [] });

    // Alert sucesso
    const msg = `✅ Produto vinculado!\n${produtoSF.supplierName} ↔ ${produtoMilao.supplierName}`;
    if (showNotification) showNotification(msg, 'success');
    else alert(msg);
  };

  const adicionarAoMilao = (produtoSF) => {
    // Criar modal para definir preços Milão
    const milaoDE = prompt(`Preço MILÃO DE para ${produtoSF.supplierName}:`, produtoSF.sfDe || '0');
    const milaoPOR = prompt(`Preço MILÃO POR para ${produtoSF.supplierName}:`, produtoSF.sfPor || '0');

    if (milaoDE && milaoPOR) {
      const novoProduto = {
        ...produtoSF,
        milaoDe: parseFloat(milaoDE),
        milaoPor: parseFloat(milaoPOR),
        status: 'both',
        isLinked: true
      };

      // Recalcular
      novoProduto.finalCost = parseFloat(milaoPOR);
      novoProduto.profit = novoProduto.sfPor - parseFloat(milaoPOR);
      novoProduto.margin = ((novoProduto.sfPor - parseFloat(milaoPOR)) / novoProduto.sfPor) * 100;

      // Atualizar
      setLocalRows(prev => prev.map(r =>
        r.rowId === produtoSF.rowId ? novoProduto : r
      ));

      setModalVinculacao({ aberto: false, produtoSF: null, produtosMilao: [] });

      const msg = `✅ Produto adicionado ao Milão!\n${produtoSF.supplierName}`;
      if (showNotification) showNotification(msg, 'success');
      else alert(msg);
    }
  };

  const filtrarProdutosMilao = (termo) => {
    if (!termo) {
      // Se não há termo, mostrar todos os produtos Milão
      const milaoDisponiveis = localRows.filter(r =>
        r.milaoDe && r.milaoPor
      );
      setModalVinculacao(prev => ({
        ...prev,
        produtosMilao: milaoDisponiveis
      }));
    } else {
      // Filtrar por termo
      const filtrados = localRows.filter(r =>
        r.milaoDe && r.milaoPor &&
        r.supplierName.toLowerCase().includes(termo.toLowerCase())
      );
      setModalVinculacao(prev => ({
        ...prev,
        produtosMilao: filtrados
      }));
    }
  };

  // Atualizar localRows quando rows mudar
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  // Função SF Final
  const handleSfFinalChange = (rowId: string, novoValor: number) => {
    const row = localRows.find(r => r.rowId === rowId);
    if (row) {
      if (onUpdateRow) {
        onUpdateRow(rowId, { sfFinal: novoValor });
      } else {
        // Fallback local se a prop não for passada
        const newRows = localRows.map(r =>
          r.rowId === rowId
            ? { ...r, sfFinal: novoValor }
            : r
        );
        setLocalRows(newRows);
      }
      console.log('SF Final atualizado:', rowId, novoValor);
    }
  };

  // 🔥 CORREÇÃO: Função para abrir modal de vínculo
  const openLinkModal = (row: DashboardRow) => {
    setSelectedRowForLink(row);
    setLinkModalOpen(true);
    // 🔥 FIX: Log para debug
    console.log('Produtos disponíveis para vínculo:', localRows.slice(0, 3));
    // 🔥 DEBUG listaMilao
    console.log('Lista Milão disponível:', localRows.slice(0, 3).map(m => ({ id: m.rowId, name: m.supplierName })));
  };

  // 🔥 CORREÇÃO: Função para confirmar vínculo
  const confirmarVinculo = (rowParaEditar, novoProdutoMilao) => {
    // 🔥 PROTEÇÃO TOTAL ANTI-CRASH
    if (!novoProdutoMilao || !novoProdutoMilao.name) {
      if (showNotification) showNotification('❌ Produto inválido selecionado', 'error');
      else alert('❌ Produto inválido selecionado');
      return;
    }

    console.log("🔗 VINCULANDO:", rowParaEditar.storeProduct?.name, "->", novoProdutoMilao.name);

    const novasLinhas = localRows.map((r) => {
      if (r.rowId === rowParaEditar.rowId) {
        // AQUI ESTÁ O SEGREDO: Atualizar TUDO para virar 'BOTH'
        return {
          ...r,
          // 1. Dados do Milão
          supplierProduct: novoProdutoMilao,
          supplierName: novoProdutoMilao.name,
          supplierCostRaw: novoProdutoMilao.price || 0,

          // 2. FORÇAR STATUS BOTH (Isso faz a tabela mudar de cor e liberar cálculo)
          _merge: 'both',
          sfMatch: 'BOTH',
          matchType: 'manual',

          // 3. Recalcular Lucro Imediato (Simplificado)
          finalCost: novoProdutoMilao.price || 0
        };
      }
      return r;
    });

    setLocalRows(novasLinhas);
    setLinkModalOpen(false);
    setLinkModalOpen(false);
    const msg = "✅ Vínculo realizado! O produto agora é 'BOTH'.";
    if (showNotification) showNotification(msg, 'success');
    else alert(msg);
  };

  const filteredRows = (localRows || []).filter(r => {
    if (!r) return false;
    const sName = (r.supplierName || '').toLowerCase();
    const sTerm = (searchTerm || '').toLowerCase();
    const stName = (r.storeProduct?.name || '').toLowerCase();
    return sName.includes(sTerm) || stName.includes(sTerm);
  });

  const rowsComScore = filteredRows.map(row => {
    const intel = intelCache[row.rowId || ''];
    const sfFinal = Number(row.sfFinal || row.sfPor || 0);
    const saPreco = intel?.saPreco || row.superAdegaPrice || 0;
    const vivino = intel?.vivino || row.vivinoRating || 0;
    const vantagem = saPreco > 0 ? saPreco - sfFinal : 0;
    const temImagem = !!(row.image || row.imagem || row.imageUrl);

    // Score de postabilidade 0-100
    const score = Math.min(100, Math.round(
      (vivino >= 4.2 ? 40 : vivino >= 3.9 ? 30 : vivino >= 3.6 ? 20 : vivino > 0 ? 10 : 0) +
      (vantagem >= 30 ? 30 : vantagem >= 20 ? 25 : vantagem >= 10 ? 15 : vantagem > 0 ? 5 : 0) +
      (temImagem ? 20 : 0) +
      (saPreco > 0 ? 10 : 0)
    ));

    return { ...row, _score: score, _isOp: vivino >= 4.0 && vantagem >= 10 };
  });

  const rowsFinais = filtroOportunidades
    ? rowsComScore.filter(r => r._isOp).sort((a, b) => (b as any)._score - (a as any)._score)
    : rowsComScore;

  // 🔥 DEBUG TABELA COMPLETO


  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-4">
        {/* SEARCH */}
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a2e] border border-[#333] rounded-lg text-white focus:outline-none focus:border-[#00ff88] text-sm"
              />
            </div>

            <button
              onClick={() => setFiltroOportunidades(prev => !prev)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filtroOportunidades ? '#00ff88' : '#1a1a2e',
                color: filtroOportunidades ? '#000' : '#00ff88',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: filtroOportunidades ? '0 0 12px #00ff8866' : 'none',
                transition: 'all 0.2s'
              }}
              title="Filtra a tabela para mostrar apenas vinhos com nota 4.0+ e preço atrativo vs SuperAdega"
            >
              🔥 {filtroOportunidades ? 'MOSTRANDO OPORTUNIDADES' : 'VER SÓ OPORTUNIDADES'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {rowsFinais.length} de {localRows.length} produtos
            </div>
            {onAplicarTodosAlertas && (
              <button
                onClick={onAplicarTodosAlertas}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                title="Corrige o preço de todos os produtos que estão com margem de lucro abaixo do permitido"
              >
                <AlertCircle size={16} />
                Aplicar em Todos com Alerta
              </button>
            )}

            <button
              onClick={onSyncML}
              disabled={isSyncingML}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 text-white shadow-md transition-all active:scale-95 ${isSyncingML ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'}`}
              title="Atualiza os preços de mercado vindo diretamente do Mercado Livre"
            >
              {isSyncingML ? '⏳ Sincronizando...' : '🛒 Sincronizar ML'}
            </button>
          </div>
        </div>

        <div className="relative">
          <table className="w-full border-collapse text-xs table-auto">
            <thead className="bg-gray-100 sticky top-0 z-[50] shadow-sm uppercase font-black text-[10px]">
              <tr>
                <th className="px-1 py-2 text-center w-16 bg-gray-200">Ações</th>
                <th className="px-2 py-2 text-left w-80 bg-gray-200">Produto</th>

                {/* BLOCO 1 - MILÃO (AZUL) */}
                <th className="px-1 py-2 bg-blue-100 text-blue-800 border-x border-blue-200 w-24">Milão De</th>
                <th className="px-1 py-2 bg-blue-100 text-blue-800 border-x border-blue-200 w-24">Milão Por</th>
                <th className="px-1 py-2 bg-blue-100 text-blue-800 border-x border-blue-200 w-20">Insta</th>

                {/* BLOCO 2 - SF (VERDE) */}
                <th className="px-1 py-2 bg-green-100 text-green-800 border-x border-green-200 w-24">SF De</th>
                <th className="px-1 py-2 bg-green-100 text-green-800 border-x border-green-200 w-24">SF Por</th>
                <th className="px-1 py-2 bg-green-100 text-green-800 border-x border-green-200 w-24">SF Sug</th>
                <th className="px-1 py-2 bg-green-100 text-green-800 border-x border-green-200 w-24">Lucro</th>
                <th className="px-1 py-2 bg-green-600 text-white border-x border-green-700 w-28 italic">SF FINAL</th>

                {/* BLOCO 3 - INSTA SF (LARANJA) */}
                <th className="px-1 py-2 bg-orange-100 text-orange-800 border-x border-orange-200 w-28">SF FINAL INSTA</th>

                <th className="px-1 py-2 bg-gray-100 w-24">Melhor ML</th>
                <th className="px-1 py-2 bg-gray-100 w-24">Super A.</th>
                <th className="px-1 py-2 bg-gray-100 w-16">Img</th>
              </tr>
            </thead>
            <tbody>
              {rowsFinais.map((row: any) => {
                // 🔥 BLINDAGEM DE CÁLCULOS - VERIFICAÇÕES INICIAIS
                const temSF = row.finalCost > 0 || row.storeProduct?.price > 0 || row['SF_De'] || row['SF_Por'];
                const temMilao = row.supplierCostRaw && row.supplierCostRaw > 0;
                const custoOperacional = 5; // Frete fixo

                // 🔥 DEBUG RÁPIDO


                // MÓDULO 3 — SISTEMA DE CORES E BADGES (Regras V2.0)
                let rowBgColor = 'bg-white';
                if (row.isNewProduct && !row.isRevised) {
                  rowBgColor = 'bg-yellow-100/50'; // Destaque Amarelo Suave para Novo
                } else if (row.origin === 'ambos') {
                  rowBgColor = 'bg-white';
                } else if (row.origin === 'milao') {
                  rowBgColor = 'bg-blue-50/20';
                }

                return (
                  <React.Fragment key={row.rowId}>
                    <tr key={row.rowId} className={`
                      border-b transition-all
                      ${row.alertaDefasagem
                        ? 'bg-red-100 border-l-4 border-l-red-600 animate-pulse'
                        : row.precisaAjustar
                          ? 'bg-orange-50 border-l-4 border-l-orange-500'
                          : 'hover:bg-gray-50'
                      }
                    `}>
                      {/* Ações */}
                      <td className="px-1 py-1 text-xs">
                        {/* Checkbox para produtos Milão Only */}
                        {row.status === 'milao-only' && (
                          <input
                            type="checkbox"
                            checked={produtosSelecionados.includes(row.rowId)}
                            onChange={() => onToggleSelecao?.(row.rowId)}
                            className="mr-1"
                            title="Selecionar para conversão em lote"
                          />
                        )}
                        <button onClick={() => onDeleteRow?.(row.rowId)} className="text-red-500 mr-1" title="Excluir este produto permanentemente">🗑️</button>
                        <button
                          onClick={() => (row.status === 'sf-only' || row.status === 'mistral') ? abrirVinculacaoManual(row) : openLinkModal(row)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title={(row.status === 'sf-only' || row.status === 'mistral') ? 'Vincular ao Milão' : 'Vincular Produto'}
                        >
                          {row.storeProduct ? '🔄' : '🔗'}
                        </button>
                        {row.status === 'milao-only' && (
                          <button
                            onClick={() => onConverterMilao?.(row)}
                            className="text-green-600 hover:text-green-800 text-sm ml-1"
                            title="Converter para SF"
                          >
                            ➕
                          </button>
                        )}
                        {/* EXIBIÇÃO DE BOLINHAS (FONTES) */}
                        <div className="flex items-center gap-1 mt-2 justify-center">
                          {row.hasSF && (
                            <div
                              className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"
                              title="Presente na SF Imports (Site)"
                            />
                          )}
                          {row.hasMilao && (
                            <div
                              className="w-3 h-3 rounded-full bg-red-500 shadow-sm"
                              title="Presente no Milão (Fornecedor)"
                            />
                          )}
                        </div>
                      </td>

                      {/* Produto - MAIOR */}
                      <td className="px-2 py-2 text-sm font-semibold max-w-xs">
                        {getSourceVisual(row)}
                        <div className="flex items-center gap-1">
                          <div className={`ml-1 ${(row.status === 'sf-only' || row.status === 'mistral') ? 'text-blue-600' : 'text-red-600'}`}>
                            {row.alertaDefasagem && (
                              <div style={{
                                background: '#dc2626', color: 'white', fontSize: '10px',
                                fontWeight: 900, padding: '2px 6px', borderRadius: '4px',
                                marginBottom: '2px', display: 'inline-block'
                              }}
                                title="SF Final está abaixo do custo real — você vai vender com PREJUÍZO!"
                              >
                                🚨 PREJUÍZO — CORRIJA O SF FINAL
                              </div>
                            )}
                            {row.precisaAjustar && !row.alertaDefasagem && (
                              <div style={{
                                background: '#ea580c', color: 'white', fontSize: '10px',
                                fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                marginBottom: '2px', display: 'inline-block'
                              }}
                                title="Lucro abaixo do mínimo permitido nas configurações"
                              >
                                ⚠️ LUCRO BAIXO — AUMENTE O SF FINAL
                              </div>
                            )}
                            {row.supplierName}
                          </div>
                          {/* 🏆 BOTÃO PONTUAÇÕES — dinâmico baseado no max score */}
                          {(lookupScoreRT(row.supplierName) || row.vivinoRating || row.parkerScore) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setScoresModal({ aberto: true, nome: row.supplierName, saPrice: row.superAdegaPrice }); }}
                              title="Ver pontuações dos críticos"
                              style={{
                                background: getScoreBadgeGradient(row),
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 5,
                                padding: '1px 5px',
                                cursor: 'pointer',
                                fontSize: 11,
                                color: (getScoreBadgeGradient(row).includes('#1a1400')) ? '#ffd700' : '#ffffff',
                                fontWeight: 700,
                                flexShrink: 0,
                                lineHeight: 1.4,
                                textShadow: '0 1px 1px rgba(0,0,0,0.5)'
                              }}
                            >🏆</button>
                          )}
                        </div>
                        {row.status === 'both' && row.isLinked && (
                          <div className="text-blue-600 text-[10px] font-medium opacity-80 italic">
                            vínculo: {row.storeProduct?.name}
                          </div>
                        )}
                      </td>

                      {/* BLOCO 1 - MILÃO (AZUL SUAVE) */}
                      <td className="px-1 py-1 text-xs text-right bg-blue-50/50 border-x border-blue-100 font-medium text-blue-900">
                        {row.milaoPor > 0 ? formatCurrency(row.milaoDe) : '--'}
                      </td>
                      <td className="px-1 py-1 text-xs text-right bg-blue-50/50 border-x border-blue-100 font-bold text-blue-900 relative">
                        <div className="flex items-center justify-end gap-1">
                          {row.isCopiado && <span title="Copiado do Milão De (Fallback)" className="cursor-help absolute left-1 text-[10px]">⬛</span>}
                          <input
                            type="number"
                            step="0.01"
                            value={row.milaoPor || ''}
                            onChange={(e) => onUpdateRow?.(row.rowId, { milaoPor: parseFloat(e.target.value) || 0, isRevised: true })}
                            className="w-20 bg-transparent text-right outline-none focus:bg-white"
                          />
                        </div>
                      </td>
                      <td className="px-1 py-1 text-xs text-right bg-blue-50/50 border-x border-blue-100 italic text-blue-800">
                        <input
                          type="text"
                          value={row.instagram || ''}
                          onChange={(e) => onUpdateRow?.(row.rowId, { instagram: e.target.value, isRevised: true })}
                          className="w-16 bg-transparent text-right outline-none focus:bg-white"
                          placeholder="--"
                        />
                      </td>

                      {/* BLOCO 2 - SF (VERDE SUAVE) */}
                      <td className="px-1 py-1 text-xs text-right bg-green-50/50 border-x border-green-100 text-gray-400 line-through">
                        {row.sfDe > 0 ? formatCurrency(row.sfDe) : '--'}
                      </td>
                      <td className="px-1 py-1 text-xs text-right bg-green-50/50 border-x border-green-100 font-medium text-green-800 relative">
                        {row.sfPor > 0 ? formatCurrency(row.sfPor) : '--'}
                      </td>
                      <td className="px-1 py-1 text-xs text-right bg-green-50/50 border-x border-green-100 text-green-700">
                        {row.sfSug > 0 ? formatCurrency(row.sfSug) : '--'}
                      </td>
                      <td className={`px-1 py-1 text-xs text-right border-x border-green-100 font-black relative
                        ${row.alertaDefasagem
                          ? 'bg-red-200 text-red-800'
                          : (row.lucroReal || 0) <= 0
                            ? 'bg-red-100 text-red-700'
                            : (row.lucroReal || 0) < 10
                              ? 'bg-orange-100 text-orange-700'
                              : (row.lucroReal || 0) < 20
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-green-50/50 text-green-600'
                        }
                      `}>
                        {row.alertaMargem && (
                          <span title="Margem abaixo do Sellout configurado"
                            className="cursor-help absolute left-1 text-[10px]">🟠</span>
                        )}
                        {row.milaoPor > 0
                          ? (row.lucroReal > 0
                            ? `+${formatCurrency(row.lucroReal)}`
                            : formatCurrency(row.lucroReal))
                          : '--'
                        }
                      </td>
                      <td className={`px-1 py-1 text-xs text-right border-x shadow-inner relative
                        ${row.alertaDefasagem
                          ? 'bg-red-600 border-red-700'
                          : row.precisaAjustar
                            ? 'bg-orange-500 border-orange-600'
                            : 'bg-green-600 border-green-700'
                        }
                      `}>
                        {row.isForcado && (
                          <span title="Preço travado no Piso Absoluto (Prejuízo evitado)"
                            className="cursor-help absolute left-1 text-[10px]">🔒</span>
                        )}
                        {row.alertaDefasagem && (
                          <span title="PREJUÍZO: SF Final está abaixo do custo real! Corrija antes de exportar."
                            className="cursor-help absolute left-1 text-[10px] animate-bounce">🚨</span>
                        )}
                        {row.precisaAjustar && !row.alertaDefasagem && (
                          <span title="Lucro abaixo do mínimo permitido. Aumente o SF Final."
                            className="cursor-help absolute left-1 text-[10px]">⚠️</span>
                        )}
                        <input
                          type="number"
                          step="0.01"
                          value={row.sfFinal || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateRow?.(row.rowId, { sfFinal: val, isRevised: true });
                          }}
                          className={`w-24 px-1 py-1 text-sm text-right font-black bg-transparent outline-none
                            ${row.alertaDefasagem ? 'text-white placeholder-red-300'
                              : row.precisaAjustar ? 'text-white placeholder-orange-200'
                                : 'text-white placeholder-green-300'
                            }
                          `}
                          placeholder="0,00"
                        />
                      </td>

                      {/* BLOCO 3 - INSTA SF (LARANJA SUAVE) */}
                      <td className="px-1 py-1 text-xs text-right bg-orange-50 border-x border-orange-100">
                        {row.instagram && parseMoney(row.instagram) > 0 ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.sfFinalInsta || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateRow?.(row.rowId, { sfFinalInsta: val, isRevised: true });
                            }}
                            className="w-24 p-1 text-right border-none bg-transparent font-black text-orange-800 text-sm outline-none"
                            placeholder="--"
                          />
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>


                      {/* Melhor ML */}
                      <td className="px-1 py-1 text-xs text-center border-l bg-orange-50">
                        {(() => {
                          const mlData = getMlData(row);
                          if (mlData) {
                            return (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-orange-700">{formatCurrency(mlData.melhor_preco)}</span>
                                <button
                                  onClick={() => setMlExpandido(mlExpandido === row.rowId ? null : row.rowId)}
                                  className="text-[10px] text-blue-600 underline flex items-center gap-1"
                                  title="Ver os 3 melhores preços e vendedores atuais no Mercado Livre"
                                >
                                  <Search size={10} /> {mlExpandido === row.rowId ? 'Fechar' : 'Ver Top 3'}
                                </button>
                              </div>
                            );
                          }
                          return <span className="text-gray-400">--</span>;
                        })()}
                      </td>

                      {/* SUPER ADEGA COMPARATIVO — conectado ao cache de inteligência */}
                      {(() => {
                        const intel = intelCache[row.rowId || ''];
                        const saPreco = row.superAdegaPrice || intel?.saPreco || 0;
                        const saUrl = row.superAdegaUrl || intel?.saUrl || '#';
                        const sfPreco = Number(row.sfFinal || row.sfPor || 0);
                        const vantagem = saPreco > 0 ? saPreco - sfPreco : null;
                        const isMelhor = vantagem !== null && vantagem >= 0;
                        const isPerigo = vantagem !== null && vantagem < -0.01;
                        const vivino = intel?.vivino || row.vivinoRating || 0;
                        const isOp = vivino >= 4.0 && isMelhor && vantagem >= 10;
                        return (
                          <td className={`px-1 py-1 text-xs text-right whitespace-nowrap align-middle border-l border-gray-100 ${saPreco && isMelhor ? 'bg-green-100 font-bold text-green-700'
                            : saPreco ? 'bg-red-50 font-bold text-red-700'
                              : 'text-gray-400'
                            }`}
                            title={saPreco ? `Super Adega: R$${saPreco.toFixed(2)}\nVivino: ${vivino > 0 ? vivino.toFixed(1) : 'N/A'}\nVantagem: ${vantagem !== null ? (vantagem >= 0 ? `-R$${vantagem.toFixed(2)} mais barato` : `+R$${Math.abs(vantagem).toFixed(2)} mais caro`) : '--'}` : 'Aguardando análise...'}
                          >
                            <div className="flex flex-col items-end gap-0.5">
                              {saPreco ? (
                                <>
                                  <a href={saUrl} target="_blank" rel="noopener noreferrer"
                                    className="hover:underline flex items-center gap-1" title="Abrir página do produto na SuperAdega para conferência manual">
                                    {formatCurrency(saPreco)}
                                    <ExternalLink size={10} />
                                  </a>
                                  {isMelhor && (
                                    <span className="text-[10px] text-green-700 font-black">
                                      {isOp ? '🔥 OPORTUNIDADE' : '🏆 MELHOR PREÇO'}
                                    </span>
                                  )}
                                  {isPerigo && (
                                    <span className="text-[10px] text-red-600 font-black">
                                      ⚠️ +R${Math.abs(vantagem!).toFixed(0)} caro
                                    </span>
                                  )}
                                  {vivino > 0 && (
                                    <span className="text-[10px]" style={{ color: vivino >= 4.0 ? '#16a34a' : vivino >= 3.5 ? '#d97706' : '#dc2626' }}>
                                      ⭐ {vivino.toFixed(1)}
                                    </span>
                                  )}
                                </>
                              ) : intel ? (
                                <span className="text-[10px] text-gray-400">não encontrado</span>
                              ) : (
                                <span className="text-[10px] text-gray-300 animate-pulse">...</span>
                              )}
                            </div>
                          </td>
                        );
                      })()}

                      {/* Imagem - VISUALIZAÇÃO/EDIÇÃO */}
                      <td className="px-1 py-1 text-center">
                        <div
                          className="w-10 h-10 mx-auto rounded border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors bg-gray-50 flex items-center justify-center"
                          onClick={() => setModalImagem({
                            aberto: true,
                            rowId: row.rowId,
                            url: row.image // MANTÉM URL ORIGINAL NO ESTADO
                          })}
                          title="Alterar, buscar na internet ou remover o fundo da imagem deste produto"
                        >
                          {row.image || row.supplierName || row.storeProduct?.name ? (
                            <img
                              src={getImagemLocalPrecificador(row.image || row.productImage, row.supplierName || row.storeProduct?.name)}
                              alt=""
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                // Fallback agressivo para caminho padrão se falhar
                                if (row.image && !row.image.includes('/imagens_produtos/')) {
                                  e.currentTarget.src = `/imagens_sem_fundo/${row.image.split('/').pop()}`;
                                } else {
                                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23f3f4f6"/><text x="50%" y="50%" fill="%239ca3af" font-family="sans-serif" font-size="12" text-anchor="middle" dy=".3em">IMG</text></svg>';
                                }
                              }}
                            />
                          ) : (
                            <span className="text-[8px] text-gray-400">🖼️</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* PAINEL EXPANSÍVEL MERCADO LIVRE */}
                    {mlExpandido === row.rowId && (
                      <tr className="bg-orange-50/50 border-b">
                        <td colSpan={13} className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-orange-700 font-bold text-sm">🛒 Melhores Preços Mercado Livre:</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {getMlData(row)?.vendedores?.map((vend: any, idx: number) => (
                                <div key={idx} className="bg-white p-2 rounded border border-orange-200 shadow-sm flex flex-col">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-gray-700 truncate max-w-[150px]" title={vend.vendedor}>
                                      {idx + 1}. {vend.vendedor}
                                    </span>
                                    <span className="text-orange-600 font-black text-sm">{formatCurrency(vend.preco)}</span>
                                  </div>
                                  <a
                                    href={vend.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-auto"
                                  >
                                    {vend.titulo_ml.substring(0, 30)}... <ExternalLink size={10} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>



        {/* 🔥 CORREÇÃO: Modal de Vínculo Manual */}
        {
          linkModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Vincular Produto</h3>
                <p className="mb-4">SF: {selectedRowForLink?.storeProduct?.name}</p>

                <input
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Buscar no Milão..."
                  onChange={(e) => setTermoBuscaMilao(e.target.value)}
                />

                <div className="space-y-2">
                  {/* 🔥 FIX: Corrigir filtro de busca */}
                  {localRows
                    .filter(m =>
                      m &&
                      m.supplierName &&
                      m.supplierName.toLowerCase().includes(termoBuscaMilao.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(m => (
                      <div key={m.rowId} className="flex justify-between p-2 border hover:bg-gray-50">
                        <span>{m.supplierName}</span>
                        <button
                          onClick={() => {
                            //  CORREÇÃO FINAL: Botão Passa Produto Milão Correto
                            const milaoProduto = {
                              id: m.supplierName,
                              name: m.supplierName,
                              price: m.supplierCostRaw || m.finalCost || 0
                            };
                            confirmarVinculo(selectedRowForLink, milaoProduto);
                          }}
                        >
                          Vincular
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  className="mt-4 text-gray-500 underline"
                  onClick={() => setLinkModalOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )
        }

        {/* MODAL DE VINCULAÇÃO MANUAL */}
        {
          modalVinculacao.aberto && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto">

                {/* PRODUTO SF */}
                <div className="mb-6 p-4 bg-blue-50 rounded">
                  <h3 className="font-bold text-lg">📦 Produto SF para vincular:</h3>
                  <p className="text-xl">{modalVinculacao.produtoSF?.supplierName}</p>
                  <p>SF DE: R$ {modalVinculacao.produtoSF?.sfDe?.toFixed(2)}</p>
                  <p>SF POR: R$ {modalVinculacao.produtoSF?.sfPor?.toFixed(2)}</p>
                </div>

                {/* BUSCA */}
                <input
                  type="text"
                  placeholder="🔍 Buscar produto no Milão..."
                  className="w-full p-3 border rounded mb-4"
                  onChange={(e) => filtrarProdutosMilao(e.target.value)}
                />

                {/* LISTA PRODUTOS MILÃO */}
                <div className="space-y-2 max-h-96 overflow-auto">
                  {modalVinculacao.produtosMilao.map(prodMilao => (
                    <div
                      key={prodMilao.rowId}
                      className="p-4 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => vincularProduto(modalVinculacao.produtoSF, prodMilao)}
                    >
                      <div>
                        <p className="font-medium">{prodMilao.supplierName}</p>
                        <p className="text-sm text-gray-600">
                          Milão: R$ {prodMilao.milaoDe?.toFixed(2)} / R$ {prodMilao.milaoPor?.toFixed(2)}
                        </p>
                      </div>
                      <button className="bg-green-600 text-white px-4 py-2 rounded">
                        ✅ Vincular
                      </button>
                    </div>
                  ))}
                </div>

                {/* BOTÃO ADICIONAR AO MILÃO */}
                <button
                  onClick={() => adicionarAoMilao(modalVinculacao.produtoSF)}
                  className="w-full mt-4 bg-orange-600 text-white p-3 rounded font-bold"
                >
                  ➕ ADICIONAR ESTE PRODUTO AO MILÃO (Criar novo)
                </button>

                {/* FECHAR */}
                <button
                  onClick={() => setModalVinculacao({ aberto: false, produtoSF: null, produtosMilao: [] })}
                  className="w-full mt-2 bg-gray-600 text-white p-2 rounded"
                >
                  ✖️ Cancelar
                </button>
              </div>
            </div>
          )
        }

        {
          modalImagem.aberto && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl animate-fade-in border-t-4 border-blue-600">
                <h3 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2">
                  <span className="bg-blue-100 p-2 rounded-full text-blue-600">🖼️</span>
                  Gestão de Imagem
                </h3>

                <div className="space-y-4">
                  {/* Preview e DropZone */}
                  <div
                    className={`relative group bg-gray-50 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all min-h-[220px] 
                  ${isDragging ? 'border-blue-500 bg-blue-50 scale-102' : 'border-gray-300 hover:border-blue-400'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file, modalImagem.rowId, localRows.find(r => r.rowId === modalImagem.rowId)?.supplierName || '');
                    }}
                  >
                    {modalImagem.url ? (
                      <div className="relative w-full flex justify-center">
                        <img
                          src={getImagemLocalPrecificador(modalImagem.url)}
                          alt="Preview"
                          className="max-h-48 object-contain drop-shadow-md rounded-lg"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23f3f4f6"/><text x="50%" y="50%" fill="%239ca3af" font-family="sans-serif" font-size="16" text-anchor="middle" dy=".3em">SF Imports</text></svg>';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm font-bold pointer-events-none">
                          Arraste uma nova imagem para trocar
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center pointer-events-none">
                        <div className="text-4xl mb-2">☁️</div>
                        <p className="text-sm">Arraste uma imagem aqui</p>
                        <p className="text-[10px]">ou clique para selecionar</p>
                      </div>
                    )}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, modalImagem.rowId, localRows.find(r => r.rowId === modalImagem.rowId)?.supplierName || '');
                      }}
                    />
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWebSearch(localRows.find(r => r.rowId === modalImagem.rowId)?.supplierName || '')}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-gray-200"
                    >
                      🔍 Buscar na Internet
                    </button>
                    <button
                      onClick={() => showNotification?.('ℹ️ Imagens locais já estão sem fundo!', 'info')}
                      disabled={true}
                      className="flex-1 bg-gray-100 text-gray-400 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-gray-200 cursor-not-allowed"
                      title="As imagens em /imagens_sem_fundo/ já estão processadas sem fundo"
                    >
                      🪄 Sem Fundo (Local)
                    </button>
                  </div>

                  <div className="h-px bg-gray-100" />

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">URL Direta ou Local:</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={modalImagem.url}
                        onChange={(e) => setModalImagem({ ...modalImagem, url: e.target.value })}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="/imagens_produtos/..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        onUpdateRow?.(modalImagem.rowId, { image: modalImagem.url });
                        setModalImagem({ ...modalImagem, aberto: false });
                        if (showNotification) showNotification('✅ Imagem salva!', 'success');
                      }}
                      className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                    >
                      Confirmar Alteração
                    </button>
                    <button
                      onClick={() => setModalImagem({ ...modalImagem, aberto: false })}
                      className="px-4 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
        {/* MÓDULO 5 — PAINEL EXPANDIDO TOP 3 ML */}
        {
          modalML.aberto && modalML.produto && (
            <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
                <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    🛒 TOP 3 MERCADO LIVRE — {modalML.produto.supplierName}
                  </h3>
                  <button onClick={() => setModalML({ aberto: false, produto: null })} className="text-white hover:text-gray-200">
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="p-4">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50 text-xs font-bold text-gray-600">
                        <th className="p-2">#</th>
                        <th className="p-2">Preço</th>
                        <th className="p-2">Vendedor</th>
                        <th className="p-2">Reputação</th>
                        <th className="p-2">Vendidos</th>
                        <th className="p-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modalML.produto.mlTopResults || []).slice(0, 3).map((item, idx) => (
                        <tr key={item.ml_item_id} className="border-b hover:bg-gray-50 text-sm">
                          <td className="p-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</td>
                          <td className="p-2 font-bold text-blue-700">R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-2">{item.vendedor_nome}</td>
                          <td className="p-2 text-xs">{item.vendedor_reputacao}</td>
                          <td className="p-2 text-xs text-gray-500">{item.qtd_vendida} vendas</td>
                          <td className="p-2">
                            <button
                              onClick={() => {
                                if (onRegistrarCompra) onRegistrarCompra(item);
                                else window.open(item.link, '_blank');
                              }}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 flex items-center gap-1"
                            >
                              🛒 Comprar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!modalML.produto.mlTopResults || modalML.produto.mlTopResults.length === 0) && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            Nenhum resultado filtrado encontrado para este produto no Mercado Livre.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-gray-50 flex justify-end">
                  <button
                    onClick={() => setModalML({ aberto: false, produto: null })}
                    className="bg-gray-300 px-4 py-2 rounded font-bold text-gray-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* CORREÇÃO 3 — MODAL DE DEFASAGEM INTERATIVO */}
        {
          modalDefasagem.aberto && modalDefasagem.row && (
            <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
                <div className="bg-red-600 text-white p-5 flex flex-col items-center">
                  <div className="text-4xl mb-2">🚨</div>
                  <h3 className="font-extrabold text-xl text-center">ALERTA DE DEFASAGEM</h3>
                  <p className="text-red-100 text-sm text-center mt-1">Custo de reposição subiu!</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="text-center font-bold text-gray-800 text-lg border-b pb-4">
                    {modalDefasagem.row.supplierName}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-500 font-bold uppercase">Custo Anterior (Est.)</div>
                      <div className="text-lg font-bold text-gray-700 line-through decoration-red-500">
                        {formatCurrency(modalDefasagem.custoVelho)}
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="text-xs text-red-600 font-bold uppercase">Novo Custo Real</div>
                      <div className="text-xl font-black text-red-700">
                        {formatCurrency(modalDefasagem.custoReal)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-200 text-center">
                    <div className="text-sm font-bold text-orange-800 mb-1">Seu preço atual te dá prejuízo de:</div>
                    <div className="text-2xl font-black text-red-600 mb-2">
                      {formatCurrency(modalDefasagem.prejuizo)} / garrafa
                    </div>
                    <div className="text-xs text-gray-500">Venda: {formatCurrency(modalDefasagem.row.sfPor)}</div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-xl border-2 border-green-400 text-center shadow-inner">
                    <div className="text-sm font-bold text-green-800 mb-1">Sugestão de Preço SF POR (+{(settings?.sellout_pct || 20).toString()}%)</div>
                    <div className="text-3xl font-black text-green-700">
                      {formatCurrency(modalDefasagem.sugestaoPor)}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex gap-3">
                  <button
                    onClick={() => setModalDefasagem({ aberto: false, row: null, custoVelho: 0, custoReal: 0, sugestaoPor: 0, prejuizo: 0 })}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={() => {
                      if (onUpdateRow && modalDefasagem.row) {
                        onUpdateRow(modalDefasagem.row.rowId, { sfPor: modalDefasagem.sugestaoPor, sfFinal: modalDefasagem.sugestaoPor });
                        if (showNotification) showNotification('✅ Preço atualizado e alerta resolvido!', 'success');
                      }
                      setModalDefasagem({ aberto: false, row: null, custoVelho: 0, custoReal: 0, sugestaoPor: 0, prejuizo: 0 });
                    }}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/30 transition-all active:scale-95"
                  >
                    Atualizar Preço
                  </button>
                </div>
              </div>
            </div>
          )
        }
      </div>

      {/* ══ MODAL DE PONTUAÇÕES DOS CRÍTICOS 🏆 ══════════════════════════════ */}
      {scoresModal.aberto && (() => {
        const s = lookupScoreRT(scoresModal.nome);
        const critics = [
          { key: 'WA', label: 'Parker\nWine Advocate', val: s?.WA, color: scoreColorRT(s?.WA) },
          { key: 'JS', label: 'Suckling\nJamesSuckling', val: s?.JS, color: scoreColorRT(s?.JS) },
          { key: 'WS', label: 'Wine\nSpectator', val: s?.WS, color: scoreColorRT(s?.WS) },
          { key: 'Desc', label: 'Decanter\nDWWA', val: s?.Desc, color: scoreColorRT(s?.Desc) },
          { key: 'Tim', label: 'Tim Atkin\nMW', val: s?.Tim, color: scoreColorRT(s?.Tim) },
          { key: 'Viv', label: 'Vivino\n★/5.0', val: s?.Viv, color: vivColorRT(s?.Viv) },
        ];
        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setScoresModal({ aberto: false, nome: '' }); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(5px)',
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg,#0d0d1a 0%,#12121f 100%)',
              border: '1px solid #2a2a3e',
              borderRadius: 20,
              padding: 28,
              width: '100%',
              maxWidth: 540,
              boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,215,0,0.08)',
              position: 'relative',
            }}>
              {/* Fechar */}
              <button
                onClick={() => setScoresModal({ aberto: false, nome: '' })}
                style={{ position: 'absolute', top: 14, right: 14, background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa', display: 'flex', alignItems: 'center' }}
              ><X size={16} /></button>

              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>🏆</span>
                  <span style={{ color: '#ffd700', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Pontuações Máximas Históricas</span>
                </div>
                <div style={{ color: '#e8e0f0', fontSize: 14, fontWeight: 800, lineHeight: 1.3, paddingRight: 30 }}>
                  {scoresModal.nome}
                </div>
              </div>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                {critics.map(c => c.val ? (
                  <div key={c.key} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: '#1a1a2e', border: `1.5px solid ${c.color}55`,
                    borderRadius: 12, padding: '10px 14px', flex: '1 0 70px',
                    boxShadow: `0 0 10px ${c.color}18`,
                  }}>
                    <span style={{ fontSize: 9, color: '#777', fontWeight: 700, letterSpacing: 0.8, marginBottom: 4, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>
                      {c.label}
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.val}</span>
                  </div>
                ) : null)}
              </div>

              {/* Legenda */}
              <div style={{ background: '#111120', borderRadius: 10, padding: '8px 14px', marginBottom: scoresModal.saPrice ? 12 : 0 }}>
                <div style={{ fontSize: 9, color: '#555', marginBottom: 5, fontWeight: 700, letterSpacing: 1 }}>LEGENDA (escala 100 pts)</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[{ r: '98–100', l: 'Extraordinário', c: '#f59e0b' }, { r: '95–97', l: 'Superlativo', c: '#f97316' }, { r: '92–94', l: 'Excelente', c: '#22c55e' }, { r: '89–91', l: 'Muito Bom', c: '#16a34a' }].map(x => (
                    <div key={x.r} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />
                      <span style={{ fontSize: 10, color: '#888' }}><strong style={{ color: x.c }}>{x.r}</strong> {x.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Super Adega comparativo */}
              {scoresModal.saPrice != null && scoresModal.saPrice > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1a0d', border: '1px solid #1f3a1f', borderRadius: 10, padding: '10px 16px', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🍷</span>
                    <div>
                      <div style={{ fontSize: 10, color: '#4caf50', fontWeight: 700, letterSpacing: 1 }}>SUPER ADEGA</div>
                      <div style={{ fontSize: 10, color: '#555' }}>Preço do concorrente</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#4caf50' }}>
                    R$ {Number(scoresModal.saPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div style={{ marginTop: 14, fontSize: 9, color: '#333', textAlign: 'center' }}>
                Parker (WA) · James Suckling (JS) · Wine Spectator (WS) · Decanter · Tim Atkin MW · Vivino
              </div>
            </div>
          </div>
        );
      })()}
      {/* ══ FIM MODAL PONTUAÇÕES ══════════════════════════════════════════════ */}
    </>
  );
};
