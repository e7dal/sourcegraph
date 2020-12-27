package graphql

import (
	"context"

	gql "github.com/sourcegraph/sourcegraph/cmd/frontend/graphqlbackend"
	"github.com/sourcegraph/sourcegraph/enterprise/cmd/frontend/internal/codeintel/resolvers"
)

type newQueryResolver func(ctx context.Context, path string) (*QueryResolver, error)

type SymbolResolver struct {
	symbol resolvers.AdjustedSymbol

	locationResolver *CachedLocationResolver
	newQueryResolver newQueryResolver
}

func NewSymbolResolver(symbol resolvers.AdjustedSymbol, locationResolver *CachedLocationResolver, newQueryResolver newQueryResolver) gql.SymbolResolver {
	return &SymbolResolver{
		symbol:           symbol,
		locationResolver: locationResolver,
		newQueryResolver: newQueryResolver,
	}
}

func (r *SymbolResolver) Moniker() gql.MonikerResolver {
	return NewMonikerResolver(r.symbol.Moniker)
}

func (r *SymbolResolver) Definitions(ctx context.Context) (gql.LocationConnectionResolver, error) {
	adjustedLocations := []resolvers.AdjustedLocation{
		{
			Dump:           r.symbol.Dump,
			Path:           r.symbol.Location.Path,
			AdjustedCommit: r.symbol.Dump.Commit,
			AdjustedRange:  r.symbol.Location.Range,
		},
	}
	return NewLocationConnectionResolver(adjustedLocations, nil, r.locationResolver), nil
}

func (r *SymbolResolver) References(ctx context.Context) (gql.LocationConnectionResolver, error) {
	panic("TODO")
}

func (r *SymbolResolver) Hover(ctx context.Context) (gql.HoverResolver, error) {
	queryResolver, err := r.newQueryResolver(ctx, r.symbol.Location.Path)
	if err != nil {
		return nil, err
	}
	return queryResolver.Hover(ctx, &gql.LSIFQueryPositionArgs{
		Line:      int32(r.symbol.Location.Range.Start.Line),
		Character: int32(r.symbol.Location.Range.Start.Character),
	})
}
