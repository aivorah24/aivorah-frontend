// Real syllabus a teacher published via Manage Syllabus (server/routes/syllabusImport.js
// POST /publish) — this is what closes the "teacher uploads a book -> students
// get a learning path" loop. Each topic carries a real DB `id` used to fetch
// its resolved Read/Listen/Practice content from topic_resources.
export type DbTopic = { id: string; name: string; kind: string; page: string };
export type DbUnit = { unitNo: number; title: string; topics: DbTopic[] };
