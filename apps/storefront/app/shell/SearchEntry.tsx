import { getMessages } from "../i18n";

export function SearchEntry() {
  const messages = getMessages();

  return (
    <form
      className="header-search"
      action="/search"
      method="get"
      role="search"
      aria-labelledby="header-search-label"
    >
      <label id="header-search-label" className="header-search__label" htmlFor="header-search-query">
        {messages.header.searchLabel}
      </label>
      <input
        id="header-search-query"
        className="header-search__input"
        name="q"
        type="search"
        enterKeyHint="search"
        maxLength={120}
        placeholder={messages.header.searchPlaceholder}
      />
      <button className="header-search__submit" type="submit">
        {messages.header.searchSubmit}
      </button>
    </form>
  );
}
