package api

import (
	"context"
	"strings"

	"github.com/inconshreveable/log15"
	"github.com/opentracing/opentracing-go/log"
	"github.com/pkg/errors"
	store "github.com/sourcegraph/sourcegraph/enterprise/internal/codeintel/stores/dbstore"
	"github.com/sourcegraph/sourcegraph/enterprise/internal/codeintel/stores/lsifstore"
	"github.com/sourcegraph/sourcegraph/internal/observation"
)

type ResolvedSymbol struct {
	lsifstore.Symbol
	Dump store.Dump
}

// Symbols returns the symbols defined in the given path prefix.
func (api *CodeIntelAPI) Symbols(ctx context.Context, prefix string, uploadID, limit, offset int) (_ []ResolvedSymbol, _ int, err error) {
	ctx, endObservation := api.operations.symbols.With(ctx, &err, observation.Args{LogFields: []log.Field{
		log.String("prefix", prefix),
		log.Int("uploadID", uploadID),
		log.Int("limit", limit),
		log.Int("offset", offset),
	}})
	defer endObservation(1, observation.Args{})

	dump, exists, err := api.dbStore.GetDumpByID(ctx, uploadID)
	if err != nil {
		return nil, 0, errors.Wrap(err, "store.GetDumpByID")
	}
	if !exists {
		return nil, 0, ErrMissingDump
	}

	pathInBundle := strings.TrimPrefix(prefix, dump.Root)
	symbols, totalCount, err := api.lsifStore.Symbols(ctx, dump.ID, pathInBundle, offset, limit)
	if err != nil {
		if err == lsifstore.ErrNotFound {
			log15.Warn("Bundle does not exist")
			return nil, 0, nil
		}
		return nil, 0, errors.Wrap(err, "bundleClient.Symbols")
	}

	return resolveSymbolsWithDump(dump, symbols), totalCount, nil
}

func resolveSymbolsWithDump(dump store.Dump, symbols []lsifstore.Symbol) []ResolvedSymbol {
	var resolvedSymbols []ResolvedSymbol
	for _, pkg := range symbols {
		resolvedSymbols = append(resolvedSymbols, ResolvedSymbol{
			Dump:    dump,
			Symbol: pkg,
		})
	}
	return resolvedSymbols
}
