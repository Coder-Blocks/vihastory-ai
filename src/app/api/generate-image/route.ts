export async function POST(req: Request) {
  const { prompt } = await req.json();

  const res = await fetch(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `comic style illustration, cartoon, kids story, ${prompt}, soft lighting, cute characters`,
      }),
    }
  );

  const imageBuffer = await res.arrayBuffer();

  return new Response(imageBuffer, {
    headers: { "Content-Type": "image/png" },
  });
}