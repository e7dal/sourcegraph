package graphqlbackend

import (
	"context"

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
		expSymbols[i] = &ExpSymbol{sym: symbol}
	}
	return (*ExpSymbolConnection)(&expSymbols), nil
}

type ExpSymbolConnection []*ExpSymbol

func (c ExpSymbolConnection) Nodes() []*ExpSymbol             { return c }
func (c ExpSymbolConnection) TotalCount() int32               { return int32(len(c)) }
func (c ExpSymbolConnection) PageInfo() *graphqlutil.PageInfo { return graphqlutil.HasNextPage(false) }

type ExpSymbol struct {
	sym SymbolResolver
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

func (r *ExpSymbol) URL(ctx context.Context) (string, error) {
	// TODO(sqs): un-hardcode
	return "/github.com/hashicorp/errwrap@v1.0.0/-/symbols/gomod/github.com/hashicorp/errwrap:Wrapper", nil
}

func (r *ExpSymbol) CanonicalURL() (string, error) { return "TODO(sqs)", nil }
