export const authUrlService = {
  deveDefinirSenha() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    return (
      params.get(
        'definir-senha'
      ) === '1'
    );
  },

  abrirDefinirSenha() {
    const url =
      new URL(window.location.href);

    url.searchParams.set(
      'definir-senha',
      '1'
    );

    window.history.pushState(
      {},
      '',
      url.toString()
    );

    window.dispatchEvent(
      new PopStateEvent('popstate')
    );
  },

  limparDefinirSenha() {
    const url =
      new URL(window.location.href);

    url.searchParams.delete(
      'definir-senha'
    );

    window.history.pushState(
      {},
      '',
      url.pathname
    );

    window.dispatchEvent(
      new PopStateEvent('popstate')
    );
  },
};
