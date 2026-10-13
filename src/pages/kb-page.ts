import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

/** Knowledge base, `/kb/:topicId/:chapterId`. Opening an article counts as reading it (+2 XP once). */
export class KbPage {
  readonly search: Locator;
  readonly searchResults: Locator;
  readonly searchHits: Locator;
  readonly searchEmpty: Locator;
  readonly chapter: Locator;
  readonly articles: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByTestId('kb-search');
    this.searchResults = page.getByTestId('search-results');
    this.searchHits = page.getByTestId('search-hit');
    this.searchEmpty = page.getByTestId('search-empty');
    this.chapter = page.getByTestId('chapter');
    this.articles = this.chapter.getByTestId('kb-article');
  }

  /** `/kb/<topic>` redirects to its first chapter. */
  async gotoTopic(topicId: string): Promise<void> {
    await this.page.goto(`kb/${topicId}`);
    await expect(this.chapter).toHaveAttribute('data-topic', topicId);
  }

  /** Id (`<chapterId>:<index>`) of the first article in the open chapter. */
  async firstArticleId(): Promise<string> {
    const id = await this.articles.first().getAttribute('data-key');
    if (!id) throw new Error('The chapter has no articles');
    return id;
  }

  article(articleId: string): Locator {
    return byTestId(this.chapter, 'kb-article', articleId);
  }

  async openArticle(articleId: string): Promise<void> {
    await this.toggleArticle(articleId, 'open');
  }

  async closeArticle(articleId: string): Promise<void> {
    await this.toggleArticle(articleId, 'closed');
  }

  private async toggleArticle(articleId: string, state: 'open' | 'closed'): Promise<void> {
    const article = this.article(articleId);
    await article.getByTestId('kb-article-summary').click();
    await expect(article).toHaveAttribute('data-state', state);
  }
}
