export interface LocationData {
  [state: string]: {
    [district: string]: {
      [city: string]: string[];
    };
  };
}

export const INDIAN_LOCATIONS: LocationData = {
  "Andaman and Nicobar Islands": {
    "South Andaman": {
      "Port Blair": ["744101", "744102", "744103"],
      "Garacharma": ["744105"],
      "Dollygunj": ["744103"]
    },
    "North and Middle Andaman": {
      "Mayabunder": ["744204"],
      "Rangat": ["744205"],
      "Diglipur": ["744202"]
    },
    "Nicobar": {
      "Car Nicobar": ["744301"]
    }
  },
  "Andhra Pradesh": {
    "Visakhapatnam": {
      "Visakhapatnam City": ["530001", "530002", "530003"],
      "MVP Colony": ["530017"],
      "Gajuwaka": ["530026"],
      "Pendurthi": ["530051"],
      "Madhavadhara": ["530018"]
    },
    "NTR / Krishna": {
      "Vijayawada City": ["520001", "520002"],
      "Benz Circle": ["520010"],
      "Governorpet": ["520002"],
      "Machilipatnam": ["521001"]
    },
    "Guntur": {
      "Guntur City": ["522001", "522002"],
      "Brodipet": ["522002"],
      "Tenali": ["522201"],
      "Mangalagiri": ["522503"]
    },
    "Tirupati": {
      "Tirupati City": ["517501", "517502"],
      "Tirumala": ["517504"],
      "Srikalahasti": ["517644"]
    },
    "Anantapur": {
      "Anantapur City": ["515001"],
      "Hindupur": ["515201"],
      "Dharmavaram": ["515671"]
    },
    "Kakinada": {
      "Kakinada City": ["533001", "533003"],
      "Samalkot": ["533440"]
    },
    "East Godavari": {
      "Rajahmundry": ["533101", "533103"],
      "Ramachandrapuram": ["533255"]
    },
    "West Godavari": {
      "Eluru": ["534001"],
      "Bhimavaram": ["534201"],
      "Tadepalligudem": ["534101"]
    },
    "Nellore (SPSR Nellore)": {
      "Nellore City": ["524001", "524003"],
      "Kavali": ["524201"],
      "Gudur": ["524101"]
    },
    "Kurnool": {
      "Kurnool City": ["518001", "518002"],
      "Nandyal": ["518501"],
      "Adoni": ["518301"]
    },
    "Kadapa (YSR)": {
      "Kadapa City": ["516001"],
      "Proddatur": ["516360"]
    },
    "Srikakulam": {
      "Srikakulam City": ["532001"]
    },
    "Vizianagaram": {
      "Vizianagaram City": ["535001", "535002"]
    }
  },
  "Arunachal Pradesh": {
    "Papum Pare": {
      "Itanagar": ["791111"],
      "Naharlagun": ["791110"],
      "Yupia": ["791112"]
    },
    "Tawang": {
      "Tawang Town": ["790104"]
    },
    "West Kameng": {
      "Bomdila": ["790001"],
      "Dirang": ["790101"]
    },
    "East Siang": {
      "Pasighat": ["791102"]
    },
    "Changlang": {
      "Changlang Town": ["792120"],
      "Miao": ["792122"]
    }
  },
  "Assam": {
    "Kamrup Metropolitan": {
      "Guwahati Central": ["781001"],
      "Dispur": ["781006"],
      "GS Road": ["781005"],
      "Ganeshguri": ["781006"],
      "Paltan Bazar": ["781008"],
      "Zoo Road": ["781024"]
    },
    "Dibrugarh": {
      "Dibrugarh Town": ["786001"],
      "Duliajan": ["786602"]
    },
    "Cachar": {
      "Silchar": ["788001", "788002"]
    },
    "Jorhat": {
      "Jorhat Town": ["785001"]
    },
    "Nagaon": {
      "Nagaon Town": ["782001"]
    },
    "Sonitpur": {
      "Tezpur": ["784001"]
    },
    "Tinsukia": {
      "Tinsukia Town": ["786125"],
      "Digboi": ["786171"]
    }
  },
  "Bihar": {
    "Patna": {
      "Boring Road": ["800001"],
      "Kankerbagh": ["800020"],
      "Bailey Road": ["800014"],
      "Patna Sahib / City": ["800008"],
      "Patliputra Colony": ["800013"],
      "Rajendra Nagar": ["800016"],
      "Danapur": ["801503"]
    },
    "Gaya": {
      "Gaya City": ["823001"],
      "Bodh Gaya": ["824231"]
    },
    "Muzaffarpur": {
      "Muzaffarpur City": ["842001", "842002"]
    },
    "Bhagalpur": {
      "Bhagalpur City": ["812001", "812002"]
    },
    "Darbhanga": {
      "Darbhanga City": ["846004"]
    },
    "Purnea": {
      "Purnea City": ["854301"]
    },
    "Begusarai": {
      "Begusarai Town": ["851101"]
    },
    "Nalanda": {
      "Bihar Sharif": ["803101"],
      "Rajgir": ["803116"]
    },
    "Rohtas": {
      "Sasaram": ["821115"],
      "Dehri-on-Sone": ["821307"]
    },
    "Saran": {
      "Chhapra": ["841301"]
    }
  },
  "Chandigarh": {
    "Chandigarh": {
      "Sector 17": ["160017"],
      "Sector 22": ["160022"],
      "Sector 35": ["160035"],
      "Sector 43": ["160043"],
      "Sector 8": ["160009"],
      "Industrial Area Phase 1": ["160002"]
    }
  },
  "Chhattisgarh": {
    "Raipur": {
      "Raipur Central": ["492001"],
      "Pandri": ["492004"],
      "Shankar Nagar": ["492007"],
      "Naya Raipur": ["492018"]
    },
    "Durg": {
      "Bhilai": ["490001", "490006", "490020"],
      "Durg City": ["491001"]
    },
    "Bilaspur": {
      "Bilaspur City": ["495001"]
    },
    "Korba": {
      "Korba Town": ["495677"]
    },
    "Rajnandgaon": {
      "Rajnandgaon City": ["491441"]
    },
    "Bastar": {
      "Jagdalpur": ["494001"]
    },
    "Raigarh": {
      "Raigarh Town": ["496001"]
    }
  },
  "Dadra and Nagar Haveli and Daman and Diu": {
    "Daman": {
      "Daman Town": ["396210"],
      "Nani Daman": ["396210"]
    },
    "Diu": {
      "Diu Town": ["362520"]
    },
    "Dadra and Nagar Haveli": {
      "Silvassa": ["396230"]
    }
  },
  "Delhi (NCT)": {
    "New Delhi": {
      "Connaught Place": ["110001"],
      "Chanakyapuri": ["110021"],
      "Lodhi Road": ["110003"],
      "Parliament Street": ["110001"],
      "Barakhamba Road": ["110001"]
    },
    "Central Delhi": {
      "Daryaganj": ["110006"],
      "Karol Bagh": ["110005"],
      "Paharganj": ["110055"],
      "Patel Nagar": ["110008"]
    },
    "South Delhi": {
      "Hauz Khas": ["110016"],
      "Saket": ["110017"],
      "Vasant Kunj": ["110070"],
      "Greater Kailash": ["110048"],
      "Lajpat Nagar": ["110024"],
      "Defence Colony": ["110024"],
      "Green Park": ["110016"]
    },
    "North Delhi": {
      "Civil Lines": ["110054"],
      "Pitampura": ["110034"],
      "Model Town": ["110009"],
      "Kamla Nagar": ["110007"]
    },
    "East Delhi": {
      "Laxmi Nagar": ["110092"],
      "Mayur Vihar": ["110091"],
      "Preet Vihar": ["110092"],
      "IP Extension": ["110092"]
    },
    "West Delhi": {
      "Janakpuri": ["110058"],
      "Rajouri Garden": ["110027"],
      "Punjabi Bagh": ["110026"],
      "Dwarka": ["110075", "110078"],
      "Tilak Nagar": ["110018"]
    },
    "South West Delhi": {
      "Vasant Vihar": ["110057"],
      "Najafgarh": ["110043"]
    },
    "North West Delhi": {
      "Rohini": ["110085", "110086"],
      "Shalimar Bagh": ["110088"]
    },
    "Shahdara": {
      "Shahdara": ["110032"],
      "Dilshad Garden": ["110095"]
    }
  },
  "Goa": {
    "North Goa": {
      "Panaji": ["403001"],
      "Porvorim": ["403521"],
      "Mapusa": ["403507"],
      "Calangute": ["403516"],
      "Bicholim": ["403504"]
    },
    "South Goa": {
      "Margao": ["403601"],
      "Vasco da Gama": ["403802"],
      "Ponda": ["403401"],
      "Curchorem": ["403706"]
    }
  },
  "Gujarat": {
    "Ahmedabad": {
      "Navrangpura": ["380009"],
      "Bodakdev / SG Highway": ["380054"],
      "Satellite": ["380015"],
      "Paldi": ["380007"],
      "Maninagar": ["380008"],
      "Vastrapur": ["380015"],
      "CG Road": ["380006"],
      "Bopal": ["380058"]
    },
    "Surat": {
      "Surat Central": ["395003"],
      "Adajan": ["395009"],
      "Varachha": ["395006"],
      "Vesu": ["395007"],
      "Piplod": ["395007"]
    },
    "Vadodara": {
      "Alkapuri": ["390007"],
      "Sayajiganj": ["390005"],
      "Fatehgunj": ["390002"],
      "Gotri": ["390021"]
    },
    "Rajkot": {
      "Rajkot Central": ["360001"],
      "Kalawad Road": ["360005"],
      "Race Course Road": ["360001"]
    },
    "Gandhinagar": {
      "Sector 11": ["382011"],
      "GIFT City": ["382355"],
      "Kudasan": ["382421"]
    },
    "Bhavnagar": {
      "Bhavnagar City": ["364001"]
    },
    "Jamnagar": {
      "Jamnagar City": ["361001"]
    },
    "Junagadh": {
      "Junagadh City": ["362001"]
    },
    "Anand": {
      "Anand Town": ["388001"],
      "Vallabh Vidyanagar": ["388120"]
    },
    "Bharuch": {
      "Bharuch City": ["392001"],
      "Ankleshwar": ["393002"]
    },
    "Navsari": {
      "Navsari Town": ["396445"]
    },
    "Valsad": {
      "Valsad Town": ["396001"],
      "Vapi": ["396191"]
    },
    "Kutch": {
      "Bhuj": ["370001"],
      "Gandhidham": ["370201"]
    }
  },
  "Haryana": {
    "Gurugram": {
      "DLF Phase 1": ["122002"],
      "DLF Phase 2": ["122008"],
      "DLF Phase 3": ["122010"],
      "DLF Phase 4": ["122009"],
      "DLF Phase 5 / Golf Course": ["122011"],
      "Cyber City": ["122002"],
      "Sector 56": ["122011"],
      "Sohna Road": ["122018"],
      "Sector 48": ["122018"]
    },
    "Faridabad": {
      "Sector 15": ["121007"],
      "NIT Faridabad": ["121001"],
      "Greater Faridabad": ["121002"]
    },
    "Panchkula": {
      "Sector 5": ["134109"],
      "Sector 20": ["134116"],
      "Mansa Devi Complex": ["134114"]
    },
    "Ambala": {
      "Ambala Cantt": ["133001"],
      "Ambala City": ["134003"]
    },
    "Karnal": {
      "Karnal City": ["132001"]
    },
    "Panipat": {
      "Panipat City": ["132103"]
    },
    "Rohtak": {
      "Rohtak City": ["124001"]
    },
    "Hisar": {
      "Hisar City": ["125001"]
    },
    "Sonipat": {
      "Sonipat City": ["131001"],
      "Kundli": ["131028"]
    },
    "Kurukshetra": {
      "Thanesar": ["136118"]
    },
    "Yamunanagar": {
      "Yamunanagar Town": ["135001"],
      "Jagadhri": ["135003"]
    }
  },
  "Himachal Pradesh": {
    "Shimla": {
      "Mall Road": ["171001"],
      "Shimla City": ["171001"],
      "Sanjauli": ["171006"],
      "Kasumpti": ["171009"]
    },
    "Kangra": {
      "Dharamshala": ["176215"],
      "McLeod Ganj": ["176219"],
      "Palampur": ["176061"]
    },
    "Solan": {
      "Solan Town": ["173212"],
      "Baddi": ["173205"]
    },
    "Mandi": {
      "Mandi Town": ["175001"]
    },
    "Kullu": {
      "Manali": ["175131"],
      "Kullu Town": ["175101"]
    },
    "Hamirpur": {
      "Hamirpur Town": ["177001"]
    },
    "Una": {
      "Una Town": ["174303"]
    }
  },
  "Jammu and Kashmir": {
    "Srinagar": {
      "Lal Chowk": ["190001"],
      "Srinagar City": ["190001"],
      "Rajbagh": ["190008"],
      "Hazratbal": ["190006"]
    },
    "Jammu": {
      "Jammu Tawi": ["180001"],
      "Gandhi Nagar": ["180004"],
      "Trikuta Nagar": ["180012"]
    },
    "Anantnag": {
      "Anantnag Town": ["192101"]
    },
    "Baramulla": {
      "Baramulla Town": ["193101"],
      "Gulmarg": ["193106"]
    },
    "Udhampur": {
      "Udhampur Town": ["182101"],
      "Katra": ["182301"]
    }
  },
  "Jharkhand": {
    "Ranchi": {
      "Main Road": ["834001"],
      "Kanke": ["834006"],
      "Doranda": ["834002"],
      "Lalpur": ["834001"],
      "Hinoo": ["834002"]
    },
    "East Singhbhum": {
      "Jamshedpur (Bistupur)": ["831001"],
      "Sakchi": ["831001"],
      "Kadma": ["831005"],
      "Telco": ["831004"]
    },
    "Dhanbad": {
      "Dhanbad City": ["826001"],
      "Jharia": ["828111"]
    },
    "Bokaro": {
      "Bokaro Steel City": ["827001", "827004"]
    },
    "Hazaribagh": {
      "Hazaribagh Town": ["825301"]
    },
    "Deoghar": {
      "Deoghar Town": ["814112"]
    },
    "Giridih": {
      "Giridih Town": ["815301"]
    }
  },
  "Karnataka": {
    "Bengaluru Urban": {
      "MG Road / Central": ["560001"],
      "Indiranagar": ["560038"],
      "Koramangala": ["560034"],
      "HSR Layout": ["560102"],
      "Whitefield": ["560066"],
      "Electronic City": ["560100"],
      "Jayanagar": ["560011"],
      "JP Nagar": ["560078"],
      "Hebbal": ["560024"],
      "Yelahanka": ["560064"],
      "Marathahalli": ["560037"],
      "BTM Layout": ["560076"],
      "Malleshwaram": ["560003"],
      "Rajajinagar": ["560010"],
      "Bellandur": ["560103"]
    },
    "Mysuru": {
      "Mysuru City": ["570001", "570002"],
      "Gokulam": ["570002"],
      "Saraswathipuram": ["570009"],
      "Vijayanagar": ["570017"]
    },
    "Dakshina Kannada": {
      "Mangaluru": ["575001", "575002", "575003"],
      "Surathkal": ["575014"],
      "Kankanady": ["575002"]
    },
    "Dharwad": {
      "Hubballi": ["580020", "580023"],
      "Dharwad": ["580001"]
    },
    "Belagavi": {
      "Belagavi City": ["590001", "590002"]
    },
    "Kalaburagi": {
      "Kalaburagi / Gulbarga": ["585101", "585102"]
    },
    "Udupi": {
      "Udupi Town": ["576101"],
      "Manipal": ["576104"]
    },
    "Shivamogga": {
      "Shivamogga Town": ["577201"]
    },
    "Ballari": {
      "Ballari / Bellary": ["583101"],
      "Hosapete": ["583201"]
    },
    "Tumakuru": {
      "Tumakuru Town": ["572101"]
    },
    "Mandya": {
      "Mandya Town": ["571401"]
    },
    "Davanagere": {
      "Davanagere City": ["577001", "577002"]
    }
  },
  "Kerala": {
    "Thiruvananthapuram": {
      "Thiruvananthapuram Central": ["695001"],
      "Technopark / Kazhakkoottam": ["695581"],
      "Vazhuthacaud": ["695014"],
      "Kowdiar": ["695003"]
    },
    "Ernakulam": {
      "Kochi Central": ["682011"],
      "Marine Drive": ["682031"],
      "Kakkanad / InfoPark": ["682030"],
      "Aluva": ["683101"],
      "Edappally": ["682024"],
      "Vyttila": ["682019"]
    },
    "Kozhikode": {
      "Kozhikode City": ["673001", "673002"],
      "Cyberpark": ["673016"]
    },
    "Thrissur": {
      "Thrissur City": ["680001"],
      "Swaraj Round": ["680001"]
    },
    "Kollam": {
      "Kollam City": ["691001"]
    },
    "Kannur": {
      "Kannur Town": ["670001"]
    },
    "Alappuzha": {
      "Alappuzha Town": ["688001"]
    },
    "Kottayam": {
      "Kottayam Town": ["686001"]
    },
    "Palakkad": {
      "Palakkad Town": ["678001"]
    },
    "Malappuram": {
      "Malappuram Town": ["676505"]
    },
    "Wayanad": {
      "Kalpetta": ["673121"]
    }
  },
  "Ladakh": {
    "Leh": {
      "Leh Town": ["194101"]
    },
    "Kargil": {
      "Kargil Town": ["194103"]
    }
  },
  "Lakshadweep": {
    "Lakshadweep": {
      "Kavaratti": ["682555"],
      "Agatti": ["682553"],
      "Amini": ["682552"]
    }
  },
  "Madhya Pradesh": {
    "Indore": {
      "Vijay Nagar": ["452010"],
      "Palasia": ["452001"],
      "MG Road": ["452007"],
      "Bhawarkua": ["452001"],
      "Super Corridor": ["452005"]
    },
    "Bhopal": {
      "MP Nagar": ["462011"],
      "Arera Colony": ["462016"],
      "Kolar Road": ["462042"],
      "New Market": ["462003"]
    },
    "Gwalior": {
      "Gwalior City": ["474001"],
      "City Centre": ["474011"]
    },
    "Jabalpur": {
      "Jabalpur City": ["482001", "482002"],
      "Wright Town": ["482002"]
    },
    "Ujjain": {
      "Ujjain City": ["456001", "456010"]
    },
    "Sagar": {
      "Sagar City": ["470001"]
    },
    "Ratlam": {
      "Ratlam City": ["457001"]
    },
    "Satna": {
      "Satna City": ["485001"]
    },
    "Rewa": {
      "Rewa City": ["486001"]
    },
    "Dewas": {
      "Dewas City": ["455001"]
    }
  },
  "Maharashtra": {
    "Mumbai City": {
      "Fort": ["400001"],
      "Kalbadevi": ["400002"],
      "Girgaon": ["400004"],
      "Byculla": ["400011"],
      "Colaba": ["400005"],
      "Marine Lines": ["400020"],
      "Dadar": ["400014"],
      "Nariman Point": ["400021"],
      "Worli": ["400018"],
      "Lower Parel": ["400013"]
    },
    "Mumbai Suburban": {
      "Andheri West": ["400053", "400058"],
      "Andheri East": ["400069", "400093"],
      "Bandra West": ["400050"],
      "Bandra East": ["400051"],
      "Borivali West": ["400092"],
      "Borivali East": ["400066"],
      "Goregaon West": ["400062"],
      "Malad West": ["400064"],
      "Kandivali West": ["400067"],
      "Powai": ["400076"],
      "Ghatkopar West": ["400086"],
      "Juhu": ["400049"],
      "Kurla": ["400070"],
      "Santacruz West": ["400054"],
      "Vile Parle East": ["400057"]
    },
    "Thane": {
      "Thane West": ["400601", "400602"],
      "Thane East": ["400603"],
      "Kalyan": ["421301"],
      "Dombivli": ["421201"],
      "Navi Mumbai (Vashi)": ["400703"],
      "Navi Mumbai (Nerul)": ["400706"],
      "Belapur": ["400614"],
      "Mira Road": ["401107"],
      "Bhayandar": ["401105"]
    },
    "Pune": {
      "Pune City": ["411001", "411002", "411004", "411030"],
      "Kothrud": ["411038"],
      "Viman Nagar": ["411014"],
      "Baner": ["411045"],
      "Hinjawadi": ["411057"],
      "Hadapsar": ["411028"],
      "Pimpri": ["411018"],
      "Chinchwad": ["411019"],
      "Wakad": ["411057"],
      "Aundh": ["411007"],
      "Kharadi": ["411014"],
      "Magarpatta": ["411028"]
    },
    "Nagpur": {
      "Nagpur City": ["440001", "440002"],
      "Dharampeth": ["440010"],
      "Manewada": ["440024"],
      "Civil Lines": ["440001"],
      "Sadar": ["440001"]
    },
    "Nashik": {
      "Nashik City": ["422001", "422002"],
      "Panchavati": ["422003"],
      "Satpur": ["422007"],
      "Indira Nagar": ["422009"],
      "CIDCO Nashik": ["422009"]
    },
    "Chhatrapati Sambhajinagar": {
      "Aurangabad City": ["431001", "431003"],
      "CIDCO": ["431005"],
      "Garkheda": ["431009"]
    },
    "Kolhapur": {
      "Kolhapur City": ["416001", "416002"],
      "Rajarampuri": ["416008"],
      "Tarabai Park": ["416003"]
    },
    "Solapur": {
      "Solapur City": ["413001", "413002"]
    },
    "Amravati": {
      "Amravati City": ["444601"]
    },
    "Nanded": {
      "Nanded City": ["431601"]
    },
    "Jalgaon": {
      "Jalgaon City": ["425001"]
    },
    "Raigad": {
      "Kharghar": ["410210"],
      "Panvel": ["410206"],
      "Taloja": ["410208"]
    },
    "Palghar": {
      "Vasai": ["401201"],
      "Virar": ["401303"],
      "Palghar Town": ["401404"]
    },
    "Sangli": {
      "Sangli City": ["416416"],
      "Miraj": ["416410"]
    },
    "Satara": {
      "Satara City": ["415001"]
    }
  },
  "Manipur": {
    "Imphal East": {
      "Imphal City (East)": ["795001"],
      "Porompat": ["795005"]
    },
    "Imphal West": {
      "Imphal City (West)": ["795001"],
      "Lamphelpat": ["795004"]
    },
    "Churachandpur": {
      "Churachandpur Town": ["795128"]
    },
    "Thoubal": {
      "Thoubal Town": ["795138"]
    },
    "Bishnupur": {
      "Bishnupur Town": ["795126"]
    }
  },
  "Meghalaya": {
    "East Khasi Hills": {
      "Shillong Central": ["793001"],
      "Laitumkhrah": ["793003"],
      "Police Bazar": ["793001"],
      "Rynjah": ["793006"]
    },
    "West Garo Hills": {
      "Tura Town": ["794001"]
    },
    "Ri-Bhoi": {
      "Nongpoh": ["793102"]
    },
    "West Jaintia Hills": {
      "Jowai": ["793150"]
    }
  },
  "Mizoram": {
    "Aizawl": {
      "Aizawl Central": ["796001"],
      "Khatla": ["796001"],
      "Zarkawt": ["796007"]
    },
    "Lunglei": {
      "Lunglei Town": ["796701"]
    },
    "Champhai": {
      "Champhai Town": ["796321"]
    },
    "Kolasib": {
      "Kolasib Town": ["796081"]
    }
  },
  "Nagaland": {
    "Kohima": {
      "Kohima Town": ["797001"],
      "Highland Park": ["797001"]
    },
    "Dimapur": {
      "Dimapur Town": ["797112"],
      "Chumoukedima": ["797103"]
    },
    "Mokokchung": {
      "Mokokchung Town": ["798601"]
    },
    "Tuensang": {
      "Tuensang Town": ["798612"]
    },
    "Wokha": {
      "Wokha Town": ["797111"]
    }
  },
  "Odisha": {
    "Khurda": {
      "Bhubaneswar Central": ["751001"],
      "Patia / Infocity": ["751024"],
      "Saheed Nagar": ["751007"],
      "Nayapalli": ["751012"],
      "Jatamundia": ["751003"]
    },
    "Cuttack": {
      "Cuttack City": ["753001", "753002"],
      "CDA Sector 6": ["753014"]
    },
    "Ganjam": {
      "Berhampur": ["760001", "760002"]
    },
    "Sundargarh": {
      "Rourkela": ["769001", "769004", "769012"]
    },
    "Puri": {
      "Puri City": ["752001", "752002"]
    },
    "Balasore": {
      "Balasore Town": ["756001"]
    },
    "Sambalpur": {
      "Sambalpur City": ["768001"]
    }
  },
  "Puducherry": {
    "Puducherry": {
      "Puducherry Town": ["605001"],
      "White Town": ["605001"],
      "Lawspet": ["605008"],
      "Mundiyampakkam": ["605602"]
    },
    "Karaikal": {
      "Karaikal Town": ["609602"]
    },
    "Mahe": {
      "Mahe Town": ["673310"]
    },
    "Yanam": {
      "Yanam Town": ["533464"]
    }
  },
  "Punjab": {
    "Ludhiana": {
      "Ludhiana Central": ["141001"],
      "Model Town": ["141002"],
      "Sarabha Nagar": ["141001"],
      "Ferozepur Road": ["141012"]
    },
    "Amritsar": {
      "Amritsar Central": ["143001"],
      "Ranjit Avenue": ["143001"],
      "Lawrence Road": ["143001"]
    },
    "Jalandhar": {
      "Model Town": ["144003"],
      "Jalandhar Cantt": ["144005"]
    },
    "SAS Nagar (Mohali)": {
      "Phase 7 Mohali": ["160062"],
      "Phase 10 Mohali": ["160062"],
      "Sector 70": ["160071"],
      "Sector 82 / IT City": ["160055"]
    },
    "Patiala": {
      "Patiala City": ["147001"],
      "Urban Estate": ["147002"]
    },
    "Bathinda": {
      "Bathinda City": ["151001"]
    },
    "Pathankot": {
      "Pathankot City": ["145001"]
    },
    "Hoshiarpur": {
      "Hoshiarpur Town": ["146001"]
    },
    "Kapurthala": {
      "Phagwara": ["144401"],
      "Kapurthala Town": ["144601"]
    }
  },
  "Rajasthan": {
    "Jaipur": {
      "MI Road / Central": ["302001"],
      "Malviya Nagar": ["302017"],
      "Vaishali Nagar": ["302021"],
      "C Scheme": ["302001"],
      "Mansarovar": ["302020"],
      "Raja Park": ["302004"],
      "Jagatpura": ["302017"]
    },
    "Jodhpur": {
      "Jodhpur Central": ["342001"],
      "Ratanada": ["342011"],
      "Shastri Nagar": ["342003"]
    },
    "Udaipur": {
      "Udaipur City": ["313001"],
      "Hiran Magri": ["313002"]
    },
    "Kota": {
      "Talwandi": ["324005"],
      "Kota Industrial Area": ["324003"],
      "Vigyan Nagar": ["324005"]
    },
    "Ajmer": {
      "Ajmer City": ["305001"],
      "Pushkar": ["305022"]
    },
    "Bikaner": {
      "Bikaner City": ["334001"]
    },
    "Alwar": {
      "Alwar City": ["301001"],
      "Bhiwadi": ["301019"]
    },
    "Bhilwara": {
      "Bhilwara City": ["311001"]
    },
    "Sikar": {
      "Sikar City": ["332001"]
    },
    "Sri Ganganagar": {
      "Sri Ganganagar Town": ["335001"]
    },
    "Jaisalmer": {
      "Jaisalmer City": ["345001"]
    }
  },
  "Sikkim": {
    "East Sikkim": {
      "Gangtok Central": ["737101"],
      "Tadong": ["737102"],
      "Deorali": ["737102"]
    },
    "South Sikkim": {
      "Namchi": ["737126"]
    },
    "West Sikkim": {
      "Geyzing": ["737111"]
    },
    "North Sikkim": {
      "Mangan": ["737116"]
    }
  },
  "Tamil Nadu": {
    "Chennai": {
      "George Town": ["600001"],
      "T. Nagar": ["600017"],
      "Adyar": ["600020"],
      "Anna Nagar": ["600040"],
      "Mylapore": ["600004"],
      "Velachery": ["600042"],
      "OMR / Sholinganallur": ["600119"],
      "Nungambakkam": ["600034"],
      "Guindy": ["600032"],
      "Porur": ["600116"]
    },
    "Coimbatore": {
      "Coimbatore City": ["641001", "641002"],
      "RS Puram": ["641002"],
      "Gandhipuram": ["641012"],
      "Peelamedu": ["641004"],
      "Saravanampatti": ["641035"]
    },
    "Madurai": {
      "Madurai City": ["625001", "625002"],
      "KK Nagar": ["625020"],
      "Anna Nagar Madurai": ["625020"]
    },
    "Tiruchirappalli": {
      "Trichy Central": ["620001"],
      "Srirangam": ["620006"],
      "Thillai Nagar": ["620018"]
    },
    "Salem": {
      "Salem City": ["636001", "636007"],
      "Fairlands": ["636016"]
    },
    "Tiruppur": {
      "Tiruppur City": ["641601", "641602"]
    },
    "Erode": {
      "Erode City": ["638001", "638011"]
    },
    "Vellore": {
      "Vellore City": ["632001", "632004"],
      "Katpadi": ["632014"]
    },
    "Tirunelveli": {
      "Tirunelveli City": ["627001"],
      "Palayamkottai": ["627002"]
    },
    "Kanchipuram": {
      "Kanchipuram Town": ["631501"],
      "Sriperumbudur": ["602105"]
    },
    "Chengalpattu": {
      "Chengalpattu Town": ["603001"],
      "Tambaram": ["600045"],
      "Chromepet": ["600044"]
    },
    "Thanjavur": {
      "Thanjavur City": ["613001"]
    },
    "Thoothukudi": {
      "Tuticorin": ["628001", "628002"]
    }
  },
  "Telangana": {
    "Hyderabad": {
      "Banjara Hills": ["500034"],
      "Jubilee Hills": ["500033"],
      "HITEC City / Gachibowli": ["500081"],
      "Madhapur": ["500081"],
      "Kondapur": ["500084"],
      "Begumpet": ["500016"],
      "Ameerpet": ["500016"],
      "Abids": ["500001"],
      "Charminar": ["500002"]
    },
    "Medchal-Malkajgiri": {
      "Secunderabad": ["500003"],
      "Malkajgiri": ["500047"],
      "Kukatpally": ["500072"],
      "Kompally": ["500100"]
    },
    "Rangareddy": {
      "Manikonda": ["500089"],
      "Shamshabad": ["501218"],
      "LB Nagar": ["500074"]
    },
    "Warangal": {
      "Warangal City": ["506001"],
      "Hanamkonda": ["506001"]
    },
    "Nizamabad": {
      "Nizamabad City": ["503001"]
    },
    "Karimnagar": {
      "Karimnagar City": ["505001"]
    },
    "Khammam": {
      "Khammam City": ["507001"]
    },
    "Nalgonda": {
      "Nalgonda Town": ["508001"]
    }
  },
  "Tripura": {
    "West Tripura": {
      "Agartala Central": ["799001"],
      "Banamalipur": ["799001"],
      "College Tilla": ["799004"]
    },
    "Gomati": {
      "Udaipur": ["799120"]
    },
    "North Tripura": {
      "Dharmanagar": ["799250"]
    },
    "Unakoti": {
      "Kailashahar": ["799277"]
    }
  },
  "Uttar Pradesh": {
    "Gautam Buddha Nagar": {
      "Noida Sector 18": ["201301"],
      "Noida Sector 62": ["201309"],
      "Noida Sector 137": ["201305"],
      "Noida Sector 150": ["201310"],
      "Greater Noida": ["201310"],
      "Greater Noida West (Noida Ext)": ["201306"]
    },
    "Ghaziabad": {
      "Indirapuram": ["201014"],
      "Vaishali": ["201010"],
      "Raj Nagar Extension": ["201017"],
      "Crossings Republik": ["201016"],
      "Vasundhara": ["201012"]
    },
    "Lucknow": {
      "Hazratganj": ["226001"],
      "Gomti Nagar": ["226010"],
      "Aliganj": ["226024"],
      "Indira Nagar": ["226016"],
      "Mahanagar": ["226006"],
      "Vipul Khand": ["226010"]
    },
    "Kanpur Nagar": {
      "Kanpur Central": ["208001"],
      "Civil Lines": ["208001"],
      "Swaroop Nagar": ["208002"],
      "Kidwai Nagar": ["208011"]
    },
    "Varanasi": {
      "Varanasi Central": ["221001"],
      "Lanka": ["221005"],
      "Sigra": ["221002"]
    },
    "Agra": {
      "Tajganj": ["282001"],
      "Sanjay Place": ["282002"],
      "Kamla Nagar Agra": ["282005"]
    },
    "Prayagraj": {
      "Civil Lines": ["211001"],
      "Katrik": ["211002"]
    },
    "Meerut": {
      "Meerut Cantt": ["250001"],
      "Shastri Nagar": ["250004"]
    },
    "Bareilly": {
      "Bareilly City": ["243001"]
    },
    "Aligarh": {
      "Aligarh City": ["202001"],
      "Civil Lines Aligarh": ["202001"]
    },
    "Moradabad": {
      "Moradabad City": ["244001"]
    },
    "Gorakhpur": {
      "Gorakhpur City": ["273001"]
    },
    "Jhansi": {
      "Jhansi City": ["284001"]
    },
    "Mathura": {
      "Mathura City": ["281001"],
      "Vrindavan": ["281121"]
    },
    "Ayodhya": {
      "Ayodhya City": ["224123"],
      "Faizabad": ["224001"]
    }
  },
  "Uttarakhand": {
    "Dehradun": {
      "Rajpur Road": ["248001"],
      "Dehradun City": ["248001"],
      "Vasant Vihar Dehradun": ["248006"],
      "Clement Town": ["248002"],
      "Rishikesh": ["249201"]
    },
    "Nainital": {
      "Haldwani": ["263139"],
      "Nainital Town": ["263001"],
      "Ramnagar": ["244715"]
    },
    "Haridwar": {
      "Haridwar City": ["249401"],
      "Roorkee": ["247667"]
    },
    "Udham Singh Nagar": {
      "Rudrapur": ["263153"],
      "Kashipur": ["244713"]
    },
    "Almora": {
      "Almora Town": ["263601"],
      "Ranikhet": ["263645"]
    }
  },
  "West Bengal": {
    "Kolkata": {
      "Park Street": ["700016"],
      "Alipore": ["700027"],
      "Ballygunge": ["700019"],
      "Salt Lake (Bidhannagar)": ["700091"],
      "New Town": ["700156"],
      "Esplanade": ["700069"],
      "Dum Dum": ["700028"],
      "Tollygunge": ["700033"],
      "Behala": ["700034"],
      "Jadavpur": ["700032"]
    },
    "North 24 Parganas": {
      "Rajarhat": ["700135"],
      "Barasat": ["700124"],
      "Barrackpore": ["700120"]
    },
    "South 24 Parganas": {
      "Garia": ["700084"],
      "Sonarpur": ["700150"],
      "Diamond Harbour": ["743331"]
    },
    "Howrah": {
      "Howrah Central": ["711101"],
      "Shibpur": ["711102"],
      "Bally": ["711201"]
    },
    "Darjeeling": {
      "Siliguri": ["734001"],
      "Darjeeling Town": ["734101"],
      "Kurseong": ["734301"]
    },
    "Hooghly": {
      "Chinsurah": ["712101"],
      "Serampore": ["712201"],
      "Chandannagar": ["712136"]
    },
    "Paschim Bardhaman": {
      "Durgapur": ["713201", "713216"],
      "Asansol": ["713301"]
    },
    "Murshidabad": {
      "Baharampur": ["742101"]
    },
    "Nadia": {
      "Kalyani": ["741235"],
      "Krishnanagar": ["741101"]
    }
  }
};

export const getIndianStates = (): string[] => {
  return Object.keys(INDIAN_LOCATIONS).sort();
};

export const getDistrictsByState = (state: string): string[] => {
  if (!state || !INDIAN_LOCATIONS[state]) return [];
  return Object.keys(INDIAN_LOCATIONS[state]).sort();
};

export const getCitiesByDistrict = (state: string, district: string): string[] => {
  if (!state || !district || !INDIAN_LOCATIONS[state]?.[district]) return [];
  return Object.keys(INDIAN_LOCATIONS[state][district]).sort();
};

export const getPincodesByCity = (state: string, district: string, city: string): string[] => {
  if (!state || !district || !city || !INDIAN_LOCATIONS[state]?.[district]?.[city]) return [];
  return INDIAN_LOCATIONS[state][district][city];
};
