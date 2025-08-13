const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('csvFile');

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return alert("📂 Please select a CSV file first.");

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (data.success) alert("✅ File uploaded. Now click on the map!");
});

const map = L.map('map').setView([23.81, 90.41], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

map.on('click', async function (e) {
  const { lat, lng } = e.latlng;

  const res = await fetch('/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon: lng, radius: 1 }) // radius in km
  });

  const data = await res.json();

  data.forEach(d => {
    L.marker([d.noisyLat, d.noisyLon])
      .addTo(map)
      .bindPopup(`Pickup Area: ${d.area || 'Unknown'}`);
  });
});
