export interface LocationData {
  [state: string]: {
    [district: string]: {
      [city: string]: string[];
    };
  };
}

export const INDIAN_LOCATIONS: LocationData = {
  "Maharashtra": {
    "Mumbai City": {
      "Fort": ["400001"],
      "Kalbadevi": ["400002"],
      "Girgaon": ["400004"],
      "Byculla": ["400011"],
      "Colaba": ["400005"],
      "Marine Lines": ["400020"],
      "Dadar": ["400014"],
      "Nariman Point": ["400021"]
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
      "Kurla": ["400070"]
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
      "Aundh": ["411007"]
    },
    "Nagpur": {
      "Nagpur City": ["440001", "440002"],
      "Dharampeth": ["440010"],
      "Manewada": ["440024"],
      "Civil Lines": ["440001"]
    },
    "Nashik": {
      "Nashik City": ["422001", "422002"],
      "Panchavati": ["422003"],
      "Satpur": ["422007"],
      "Indira Nagar": ["422009"]
    },
    "Chhatrapati Sambhajinagar": {
      "Aurangabad City": ["431001", "431003"],
      "CIDCO": ["431005"]
    },
    "Kolhapur": {
      "Kolhapur City": ["416001", "416002"],
      "Rajarampuri": ["416008"]
    },
    "Solapur": {
      "Solapur City": ["413001", "413002"]
    }
  },
  "Delhi (NCT)": {
    "New Delhi": {
      "Connaught Place": ["110001"],
      "Chanakyapuri": ["110021"],
      "Lodhi Road": ["110003"],
      "Parliament Street": ["110001"]
    },
    "Central Delhi": {
      "Daryaganj": ["110006"],
      "Karol Bagh": ["110005"],
      "Paharganj": ["110055"]
    },
    "South Delhi": {
      "Hauz Khas": ["110016"],
      "Saket": ["110017"],
      "Vasant Kunj": ["110070"],
      "Greater Kailash": ["110048"],
      "Lajpat Nagar": ["110024"],
      "Defence Colony": ["110024"]
    },
    "North Delhi": {
      "Civil Lines": ["110054"],
      "Pitampura": ["110034"],
      "Model Town": ["110009"]
    },
    "East Delhi": {
      "Laxmi Nagar": ["110092"],
      "Mayur Vihar": ["110091"],
      "Preet Vihar": ["110092"]
    },
    "West Delhi": {
      "Janakpuri": ["110058"],
      "Rajouri Garden": ["110027"],
      "Punjabi Bagh": ["110026"],
      "Dwarka": ["110075", "110078"]
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
      "BTM Layout": ["560076"]
    },
    "Mysuru": {
      "Mysuru City": ["570001", "570002"],
      "Gokulam": ["570002"],
      "Saraswathipuram": ["570009"]
    },
    "Dakshina Kannada": {
      "Mangaluru": ["575001", "575002", "575003"],
      "Surathkal": ["575014"]
    },
    "Dharwad": {
      "Hubballi": ["580020", "580023"],
      "Dharwad": ["580001"]
    },
    "Belagavi": {
      "Belagavi City": ["590001", "590002"]
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
      "Nungambakkam": ["600034"]
    },
    "Coimbatore": {
      "Coimbatore City": ["641001", "641002"],
      "RS Puram": ["641002"],
      "Gandhipuram": ["641012"],
      "Peelamedu": ["641004"]
    },
    "Madurai": {
      "Madurai City": ["625001", "625002"],
      "KK Nagar": ["625020"]
    },
    "Tiruchirappalli": {
      "Trichy Central": ["620001"],
      "Srirangam": ["620006"]
    },
    "Salem": {
      "Salem City": ["636001", "636007"]
    }
  },
  "Gujarat": {
    "Ahmedabad": {
      "Navrangpura": ["380009"],
      "Bodakdev / SG Highway": ["380054"],
      "Satellite": ["380015"],
      "Paldi": ["380007"],
      "Maninagar": ["380008"],
      "Vastrapur": ["380015"]
    },
    "Surat": {
      "Surat Central": ["395003"],
      "Adajan": ["395009"],
      "Varachha": ["395006"],
      "Vesu": ["395007"]
    },
    "Vadodara": {
      "Alkapuri": ["390007"],
      "Sayajiganj": ["390005"],
      "Fatehgunj": ["390002"]
    },
    "Rajkot": {
      "Rajkot Central": ["360001"],
      "Kalawad Road": ["360005"]
    },
    "Gandhinagar": {
      "Sector 11": ["382011"],
      "GIFT City": ["382355"]
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
      "Abids": ["500001"]
    },
    "Medchal-Malkajgiri": {
      "Secunderabad": ["500003"],
      "Malkajgiri": ["500047"],
      "Kukatpally": ["500072"]
    },
    "Warangal": {
      "Warangal City": ["506001"]
    },
    "Nizamabad": {
      "Nizamabad City": ["503001"]
    }
  },
  "Uttar Pradesh": {
    "Gautam Buddha Nagar": {
      "Noida Sector 18": ["201301"],
      "Noida Sector 62": ["201309"],
      "Noida Sector 137": ["201305"],
      "Greater Noida": ["201310"]
    },
    "Ghaziabad": {
      "Indirapuram": ["201014"],
      "Vaishali": ["201010"],
      "Raj Nagar Extension": ["201017"]
    },
    "Lucknow": {
      "Hazratganj": ["226001"],
      "Gomti Nagar": ["226010"],
      "Aliganj": ["226024"],
      "Indira Nagar": ["226016"]
    },
    "Kanpur Nagar": {
      "Kanpur Central": ["208001"],
      "Civil Lines": ["208001"],
      "Swaroop Nagar": ["208002"]
    },
    "Varanasi": {
      "Varanasi Central": ["221001"],
      "Lanka": ["221005"]
    },
    "Agra": {
      "Tajganj": ["282001"],
      "Sanjay Place": ["282002"]
    },
    "Prayagraj": {
      "Civil Lines": ["211001"]
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
      "Dum Dum": ["700028"]
    },
    "North 24 Parganas": {
      "Rajarhat": ["700135"],
      "Barasat": ["700124"]
    },
    "Howrah": {
      "Howrah Central": ["711101"],
      "Shibpur": ["711102"]
    },
    "Darjeeling": {
      "Siliguri": ["734001"],
      "Darjeeling Town": ["734101"]
    }
  },
  "Rajasthan": {
    "Jaipur": {
      "MI Road / Central": ["302001"],
      "Malviya Nagar": ["302017"],
      "Vaishali Nagar": ["302021"],
      "C Scheme": ["302001"],
      "Mansarovar": ["302020"]
    },
    "Jodhpur": {
      "Jodhpur Central": ["342001"],
      "Ratanada": ["342011"]
    },
    "Udaipur": {
      "Udaipur City": ["313001"]
    },
    "Kota": {
      "Talwandi": ["324005"],
      "Kota Industrial Area": ["324003"]
    }
  },
  "Punjab": {
    "Ludhiana": {
      "Ludhiana Central": ["141001"],
      "Model Town": ["141002"]
    },
    "Amritsar": {
      "Amritsar Central": ["143001"],
      "Ranjit Avenue": ["143001"]
    },
    "Jalandhar": {
      "Model Town": ["144003"]
    },
    "SAS Nagar (Mohali)": {
      "Phase 7 Mohali": ["160062"],
      "Phase 10 Mohali": ["160062"],
      "Sector 70": ["160071"]
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
      "Sohna Road": ["122018"]
    },
    "Faridabad": {
      "Sector 15": ["121007"],
      "NIT Faridabad": ["121001"]
    },
    "Panchkula": {
      "Sector 5": ["134109"],
      "Sector 20": ["134116"]
    },
    "Ambala": {
      "Ambala Cantt": ["133001"]
    }
  },
  "Kerala": {
    "Thiruvananthapuram": {
      "Thiruvananthapuram Central": ["695001"],
      "Technopark / Kazhakkoottam": ["695581"]
    },
    "Ernakulam": {
      "Kochi Central": ["682011"],
      "Marine Drive": ["682031"],
      "Kakkanad / InfoPark": ["682030"]
    },
    "Kozhikode": {
      "Kozhikode City": ["673001"]
    }
  },
  "Bihar": {
    "Patna": {
      "Patna Sahib / City": ["800008"],
      "Boring Road": ["800001"],
      "Kankerbagh": ["800020"],
      "Bailey Road": ["800014"]
    },
    "Gaya": {
      "Gaya City": ["823001"]
    },
    "Muzaffarpur": {
      "Muzaffarpur City": ["842001"]
    }
  },
  "Madhya Pradesh": {
    "Indore": {
      "Vijay Nagar": ["452010"],
      "Palasia": ["452001"],
      "MG Road": ["452007"]
    },
    "Bhopal": {
      "MP Nagar": ["462011"],
      "Arera Colony": ["462016"]
    },
    "Gwalior": {
      "Gwalior City": ["474001"]
    },
    "Jabalpur": {
      "Jabalpur City": ["482001"]
    }
  },
  "Andhra Pradesh": {
    "Visakhapatnam": {
      "Visakhapatnam City": ["530001"],
      "MVP Colony": ["530017"]
    },
    "NTR / Krishna": {
      "Vijayawada City": ["520001"],
      "Benz Circle": ["520010"]
    },
    "Guntur": {
      "Guntur City": ["522001"]
    },
    "Tirupati": {
      "Tirupati City": ["517501"]
    }
  },
  "Odisha": {
    "Khurda": {
      "Bhubaneswar Central": ["751001"],
      "Patia / Infocity": ["751024"]
    },
    "Cuttack": {
      "Cuttack City": ["753001"]
    }
  },
  "Assam": {
    "Kamrup Metropolitan": {
      "Guwahati Central": ["781001"],
      "Dispur": ["781006"],
      "GS Road": ["781005"]
    },
    "Dibrugarh": {
      "Dibrugarh Town": ["786001"]
    }
  },
  "Chandigarh": {
    "Chandigarh": {
      "Sector 17": ["160017"],
      "Sector 22": ["160022"],
      "Sector 35": ["160035"]
    }
  },
  "Goa": {
    "North Goa": {
      "Panaji": ["403001"],
      "Mapusa": ["403507"],
      "Calangute": ["403516"]
    },
    "South Goa": {
      "Margao": ["403601"],
      "Vasco da Gama": ["403802"]
    }
  },
  "Puducherry": {
    "Puducherry": {
      "Puducherry Town": ["605001"],
      "White Town": ["605001"]
    }
  },
  "Uttarakhand": {
    "Dehradun": {
      "Rajpur Road": ["248001"],
      "Dehradun City": ["248001"]
    },
    "Nainital": {
      "Haldwani": ["263139"],
      "Nainital Town": ["263001"]
    }
  },
  "Jharkhand": {
    "Ranchi": {
      "Main Road": ["834001"],
      "Kanke": ["834006"]
    },
    "East Singhbhum": {
      "Jamshedpur (Bistupur)": ["831001"],
      "Sakchi": ["831001"]
    },
    "Dhanbad": {
      "Dhanbad City": ["826001"]
    }
  },
  "Chhattisgarh": {
    "Raipur": {
      "Raipur Central": ["492001"],
      "Pandri": ["492004"]
    },
    "Durg": {
      "Bhilai": ["490001"]
    }
  },
  "Himachal Pradesh": {
    "Shimla": {
      "Mall Road": ["171001"],
      "Shimla City": ["171001"]
    },
    "Kangra": {
      "Dharamshala": ["176215"]
    }
  },
  "Jammu and Kashmir": {
    "Srinagar": {
      "Lal Chowk": ["190001"],
      "Srinagar City": ["190001"]
    },
    "Jammu": {
      "Jammu Tawi": ["180001"]
    }
  }
};

export const getIndianStates = (): string[] => {
  return Object.keys(INDIAN_LOCATIONS);
};

export const getDistrictsByState = (state: string): string[] => {
  if (!state || !INDIAN_LOCATIONS[state]) return [];
  return Object.keys(INDIAN_LOCATIONS[state]);
};

export const getCitiesByDistrict = (state: string, district: string): string[] => {
  if (!state || !district || !INDIAN_LOCATIONS[state]?.[district]) return [];
  return Object.keys(INDIAN_LOCATIONS[state][district]);
};

export const getPincodesByCity = (state: string, district: string, city: string): string[] => {
  if (!state || !district || !city || !INDIAN_LOCATIONS[state]?.[district]?.[city]) return [];
  return INDIAN_LOCATIONS[state][district][city];
};
