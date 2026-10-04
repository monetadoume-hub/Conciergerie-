// Lecture d'une réponse en flux « une ligne JSON par événement » (NDJSON).

export async function lireFlux<T>(reponse: Response, surEvenement: (e: T) => void): Promise<void> {
  if (!reponse.body) return;
  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";
  const vider = () => {
    let i: number;
    while ((i = tampon.indexOf("\n")) >= 0) {
      const ligne = tampon.slice(0, i).trim();
      tampon = tampon.slice(i + 1);
      if (ligne) surEvenement(JSON.parse(ligne) as T);
    }
  };
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });
    vider();
  }
  tampon += decodeur.decode();
  if (tampon.trim()) surEvenement(JSON.parse(tampon) as T);
}
