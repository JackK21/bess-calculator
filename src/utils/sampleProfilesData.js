import pgeWtryskarki from '../../public/samples/1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv?raw';
import tauronPiekarnia from '../../public/samples/2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv?raw';
import eneaLogistyka from '../../public/samples/3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv?raw';
import energaChlodnia from '../../public/samples/4_OSD_ENERGA_Chlodnia_Mroznia_12M_15min.csv?raw';
import pgeBiuro from '../../public/samples/5_OSD_PGE_Biurowiec_HVAC_12M_15min.csv?raw';
import tauronPrzetwornia from '../../public/samples/6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv?raw';
import tauronHuta from '../../public/samples/7_OSD_Huta_Odlewnia_Przemysl_12M_15min.csv?raw';

export const BUILTIN_SAMPLE_CSV_MAP = {
  '1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv': pgeWtryskarki,
  '2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv': tauronPiekarnia,
  '3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv': eneaLogistyka,
  '4_OSD_ENERGA_Chlodnia_Mroznia_12M_15min.csv': energaChlodnia,
  '5_OSD_PGE_Biurowiec_HVAC_12M_15min.csv': pgeBiuro,
  '6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv': tauronPrzetwornia,
  '7_OSD_Huta_Odlewnia_Przemysl_12M_15min.csv': tauronHuta
};

export const DEFAULT_INITIAL_CSV = pgeWtryskarki;
