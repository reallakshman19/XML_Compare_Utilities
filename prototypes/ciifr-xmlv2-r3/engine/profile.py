"""Version-14 B001-evidenced CII neutral dialect (no dependency on P1/P2)."""
from dataclasses import dataclass

VERSION = 'RichInputXMLv2.1'
PROFILE = 'CII-V14-ASCII-CRLF-B001'
SECTIONS = ('VERSION CONTROL ELEMENTS AUX_DATA NODENAME BEND RIGID EXPJT RESTRANT DISPLMNT '
            'FORCMNT UNIFORM WIND OFFSETS ALLOWBLS SIF&TEES REDUCERS FLANGES EQUIPMNT MISCEL_1 UNITS COORDS').split()
COUNT_NAMES = ('ELEMENTS NOZZLES HANGERS NODENAME REDUCERS FLANGES BEND RIGID EXPJT RESTRANT '
               'DISPLMNT FORCMNT UNIFORM WIND OFFSETS ALLOWBLS SIF&TEES IZUP EQUIPMNT').split()
POINTER_SECTIONS = ('BEND RIGID EXPJT RESTRANT DISPLMNT FORCMNT UNIFORM WIND OFFSETS ALLOWBLS '
                    'SIF&TEES NODENAME REDUCERS FLANGES EQUIPMNT').split()
# Exact populated formats evidenced by primary. Empty B001 sections have no qualified populated grammar.
# Each list gives number of *fields* on each physical row.
NUMERIC_ROWS = {
 'CONTROL':[6,6,6,1], 'BEND':[6,6,2], 'RIGID':[2],
 'DISPLMNT':[1]+[6]*9+[1]+[6]*9, 'ALLOWBLS':[6]*25+[2]+[6]*2,
 'SIF&TEES':[6]*14, 'REDUCERS':[5,5],
 'EXPJT':[5], 'FORCMNT':[1]+[6]*9+[1]+[6]*9,
 'UNIFORM':[6]*6, 'WIND':[6], 'OFFSETS':[6],
 'EQUIPMNT':[6,6,5,6,6,5],
}
# FLANGES' hybrid numeric/text shape is documented, but unobserved and explicitly unsupported.
POPULATED_SUPPORTED = {'NODENAME','BEND','RIGID','RESTRANT','DISPLMNT','ALLOWBLS','SIF&TEES','REDUCERS'}
UNOBSERVED_UNSUPPORTED = {'EXPJT','FORCMNT','UNIFORM','WIND','OFFSETS','FLANGES','EQUIPMNT'}
CONTROL_INDEX = {v:i for i,v in enumerate(COUNT_NAMES)}
ELEMENT_ROWS = [6]*8+[5,'string_a','string_b','material','pointers_6','pointers_6','pointers_3']
REST_ROWS = [6,3,'string','string']*6
FIELD_NAMES = {1:'from_node',2:'to_node',3:'delta_x',4:'delta_y',5:'delta_z',
 6:'outside_diameter',7:'wall_thickness',8:'insulation_thickness',9:'corrosion_allowance',
 10:'thermal_or_temperature_1',11:'thermal_or_temperature_2',12:'thermal_or_temperature_3',
 13:'thermal_or_temperature_4',14:'thermal_or_temperature_5',15:'thermal_or_temperature_6',
 16:'thermal_or_temperature_7',17:'thermal_or_temperature_8',18:'thermal_or_temperature_9',
 19:'pressure_1',20:'pressure_2',21:'pressure_3',22:'pressure_4',23:'pressure_5',24:'pressure_6',
 25:'pressure_7',26:'pressure_8',27:'pressure_9',28:'elastic_modulus_cold',29:'poisson_ratio',
 30:'pipe_density',31:'insulation_density',32:'fluid_density',33:'minus_mill_tolerance',
 34:'plus_mill_tolerance',35:'seam_weld',36:'hydro_pressure',
 37:'elastic_modulus_hot_1',38:'elastic_modulus_hot_2',39:'elastic_modulus_hot_3',
 40:'elastic_modulus_hot_4',41:'elastic_modulus_hot_5',42:'elastic_modulus_hot_6',
 43:'elastic_modulus_hot_7',44:'elastic_modulus_hot_8',45:'elastic_modulus_hot_9',
 46:'wL_factor',47:'orientation_to_end',48:'orientation_from_end',
 49:'cladding_thickness',50:'cladding_density',51:'insulation_cladding_weight_per_length',
 52:'refractory_thickness',53:'refractory_density'}
NODE_FIELDS = {'BEND':(4,6,8), 'SIF&TEES':(1,43), 'DISPLMNT':(1,56), 'RESTRANT':tuple(i for i in range(1,55,9))}

class CIIError(ValueError):
    """Actionable input/schema error; no successful output is published."""


def fail(where, message):
    raise CIIError(f'{where}: {message}')

# Version 14 Units Conversion Data: exactly 22 factors, 24 labels.
UNIT_FACTORS = ('CNVLEN CNVFOR CNVMAS CNVMIN CNVMOU CNVSTR CNVTSC CNVTOF '
                'CNVPRE CNVYM CNVPDN CNVIDN CNVFDN CNVTSF CNVRSF CNVUNI '
                'CNVGLD CNVWND CNVELE CNVCLN CNVDIA CNVTHK').split()
UNIT_LABELS = ('CCVNAME CCVNOM CCVLEN CCVFOR CCVMAS CCVMIN CCVMOU CCVSTR '
               'CCVTSC CCVTOF CCVPRE CCVYM CCVPDN CCVIDN CCVFDN CCVTSF '
               'CCVRSF CCVUNI CCVGLD CCVWND CCVELE CCVCLN CCVDIA CCVTHK').split()

# Qualified populated per-section indices. Unknown positions retain indexed names.
AUX_FIELD_LABELS = {
 'bend': {1:'radius',2:'type',3:'angle_position_1',4:'node_position_1',
          5:'angle_position_2',6:'node_position_2',7:'angle_position_3',8:'node_position_3',
          9:'miter_cuts',10:'fitting_thickness',11:'seam_weld',12:'flexibility_k',
          13:'weld_strength_reduction',14:'overlay_thickness'},
 'rigid': {1:'rigid_weight',2:'rigid_type'},
 'reducers': {1:'to_diameter',2:'to_wall_thickness',3:'transition_alpha',
              4:'transition_radius_r1',5:'transition_radius_r2',7:'small_end_length_l2'},
 'sif_tees': {1:'first_intersection_node',2:'first_intersection_type',
              43:'second_intersection_node',44:'second_intersection_type'},
 'displmnt': {1:'first_displacement_node',56:'second_displacement_node'},
 'allowbls': {1:'cold_allowable_stress',2:'hot_allowable_stress_1',
              12:'piping_code_id'},
}
RESTRAINT_FIELDS = ('restraint_node','restraint_type','stiffness','gap','friction',
                    'connecting_node','direction_x','direction_y','direction_z')
