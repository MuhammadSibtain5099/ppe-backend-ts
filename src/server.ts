import { app } from './app';
import { connectDB } from './db';

const port = Number(process.env.PORT || 4000);
connectDB().then(() => {
  app.listen(port, () => console.log(`PPE API on :${port}`));
});
