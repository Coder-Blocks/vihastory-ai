export type HomePoster = {
  id: number;
  title: string;
  genre: string;
  angle: number;
  top: string;
  left: string;
  width: string;
  height: string;
};

export const homePosters: HomePoster[] = [
  {
    id: 1,
    title: "Shadow Hunt",
    genre: "Thriller",
    angle: -8,
    top: "10%",
    left: "6%",
    width: "180px",
    height: "240px",
  },
  {
    id: 2,
    title: "Ghost Temple",
    genre: "Horror",
    angle: 7,
    top: "14%",
    left: "78%",
    width: "170px",
    height: "230px",
  },
  {
    id: 3,
    title: "Love Beyond Time",
    genre: "Romance",
    angle: -6,
    top: "58%",
    left: "8%",
    width: "190px",
    height: "250px",
  },
  {
    id: 4,
    title: "King of Destiny",
    genre: "Fantasy",
    angle: 9,
    top: "60%",
    left: "76%",
    width: "180px",
    height: "240px",
  },
  {
    id: 5,
    title: "Laugh Riot",
    genre: "Comedy",
    angle: -5,
    top: "72%",
    left: "30%",
    width: "160px",
    height: "210px",
  },
  {
    id: 6,
    title: "Divine Flame",
    genre: "Devotional",
    angle: 6,
    top: "12%",
    left: "32%",
    width: "170px",
    height: "225px",
  },
];