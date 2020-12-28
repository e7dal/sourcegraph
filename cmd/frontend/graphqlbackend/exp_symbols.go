package graphqlbackend

import (
	"context"
	"net/url"
	"strings"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend/graphqlutil"
)

func (r *GitTreeEntryResolver) ExpSymbols(ctx context.Context) (*ExpSymbolConnection, error) {
	lsifResolver, err := r.LSIF(ctx, &struct{ ToolName *string }{})
	if err != nil {
		return nil, err
	}

	symbolConnection, err := lsifResolver.Symbols(ctx, &LSIFSymbolsArgs{})
	if err != nil {
		return nil, err
	}
	symbols, err := symbolConnection.Nodes(ctx)
	if err != nil {
		return nil, err
	}

	expSymbols := make([]*ExpSymbol, len(symbols))
	for i, symbol := range symbols {
		expSymbols[i] = &ExpSymbol{sym: symbol, tree: r}
	}
	return (*ExpSymbolConnection)(&expSymbols), nil
}

type ExpSymbolConnection []*ExpSymbol

func (c ExpSymbolConnection) Nodes() []*ExpSymbol             { return c }
func (c ExpSymbolConnection) TotalCount() int32               { return int32(len(c)) }
func (c ExpSymbolConnection) PageInfo() *graphqlutil.PageInfo { return graphqlutil.HasNextPage(false) }

type ExpSymbol struct {
	sym  SymbolResolver
	tree *GitTreeEntryResolver
}

func (r *ExpSymbol) Moniker() MonikerResolver { return r.sym.Moniker() }

func (r *ExpSymbol) Definitions(ctx context.Context) (LocationConnectionResolver, error) {
	return r.sym.Definitions(ctx)
}

func (r *ExpSymbol) References(ctx context.Context) (LocationConnectionResolver, error) {
	return r.sym.References(ctx)
}

func (r *ExpSymbol) Hover(ctx context.Context) (HoverResolver, error) {
	return r.sym.Hover(ctx)
}

func (r *ExpSymbol) url(prefix string) string {
	return prefix + "/-/symbols/" + url.PathEscape(r.sym.Moniker().Scheme()) + "/" + strings.Replace(url.PathEscape(r.sym.Moniker().Identifier()), "%2F", "/", -1)
}

func (r *ExpSymbol) URL(ctx context.Context) (string, error) {
	prefix, err := r.tree.commit.repoRevURL()
	if err != nil {
		return "", err
	}
	return r.url(prefix), nil
}

func (r *ExpSymbol) CanonicalURL() (string, error) {
	prefix, err := r.tree.commit.canonicalRepoRevURL()
	if err != nil {
		return "", err
	}
	return r.url(prefix), nil
}
