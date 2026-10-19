const getCodes = async () => {
  try {
    const res = await fetch('https://api.mfapi.in/mf');
    const data = await res.json();
    const matches = data.filter(item => 
      item.schemeName.toLowerCase().includes('nippon') && 
      item.schemeName.toLowerCase().includes('power') && 
      item.schemeName.toLowerCase().includes('infra') && 
      item.schemeName.toLowerCase().includes('direct')
    );
    console.log('Matches:', matches);
  } catch (err) {
    console.error(err);
  }
};
getCodes();
