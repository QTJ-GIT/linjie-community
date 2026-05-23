export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publish_time: string;
  category: string;
}

export interface NewsDetail {
  title: string;
  content: string;
  source: string;
  publish_time: string;
  url: string;
}
