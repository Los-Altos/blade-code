/**
 * Spec Slice - Spec-Driven Development 状态管理
 *
 * 职责：
 * - 当前 Spec 状态
 * - Spec 模式开关
 * - Steering Context 缓存
 *
 * 注意：实际的文件 I/O 由 SpecManager 处理，这里只管理 UI 状态
 */

import type { StateCreator } from 'zustand';
import type {
  SpecMetadata,
  SpecPhase,
  SpecState as SpecManagerState,
  SpecTask,
  SteeringContext,
} from '../../spec/types.js';
import type { BladeStore } from '../types.js';

/**
 * Spec UI 状态
 */
export interface SpecState {
  /** 当前活跃的 Spec */
  currentSpec: SpecMetadata | null;
  /** Spec 文件路径 */
  specPath: string | null;
  /** 是否处于 Spec 模式 */
  isActive: boolean;
  /** Steering 上下文（缓存） */
  steeringContext: SteeringContext | null;
  /** 最近使用的 Spec 列表 */
  recentSpecs: string[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}

/**
 * Spec Actions
 */
export interface SpecActions {
  /** 设置当前 Spec */
  setCurrentSpec: (spec: SpecMetadata | null) => void;
  /** 设置 Spec 路径 */
  setSpecPath: (path: string | null) => void;
  /** 设置 Spec 模式激活状态 */
  setActive: (isActive: boolean) => void;
  /** 设置 Steering 上下文 */
  setSteeringContext: (context: SteeringContext | null) => void;
  /** 添加到最近使用列表 */
  addToRecentSpecs: (name: string) => void;
  /** 设置加载状态 */
  setLoading: (isLoading: boolean) => void;
  /** 设置错误 */
  setError: (error: string | null) => void;
  /** 更新 Spec 阶段 */
  updatePhase: (phase: SpecPhase) => void;
  /** 更新任务状态 */
  updateTask: (task: SpecTask) => void;
  /** 添加任务 */
  addTask: (task: SpecTask) => void;
  /** 重置状态 */
  reset: () => void;
  /** 从 SpecManager 同步状态 */
  syncFromManager: (state: SpecManagerState) => void;
}

/**
 * Spec Slice 类型
 */
export interface SpecSlice extends SpecState {
  actions: SpecActions;
}

/**
 * 初始状态
 */
const initialSpecState: SpecState = {
  currentSpec: null,
  specPath: null,
  isActive: false,
  steeringContext: null,
  recentSpecs: [],
  isLoading: false,
  error: null,
};

/**
 * 创建 Spec Slice
 */
export const createSpecSlice: StateCreator<BladeStore, [], [], SpecSlice> = (set) => ({
  ...initialSpecState,

  actions: {
    /**
     * 设置当前 Spec
     */
    setCurrentSpec: (spec: SpecMetadata | null) => {
      set((state) => ({
        spec: { ...state.spec, currentSpec: spec },
      }));
    },

    /**
     * 设置 Spec 路径
     */
    setSpecPath: (path: string | null) => {
      set((state) => ({
        spec: { ...state.spec, specPath: path },
      }));
    },

    /**
     * 设置 Spec 模式激活状态
     */
    setActive: (isActive: boolean) => {
      set((state) => ({
        spec: { ...state.spec, isActive },
      }));
    },

    /**
     * 设置 Steering 上下文
     */
    setSteeringContext: (context: SteeringContext | null) => {
      set((state) => ({
        spec: { ...state.spec, steeringContext: context },
      }));
    },

    /**
     * 添加到最近使用列表
     */
    addToRecentSpecs: (name: string) => {
      set((state) => {
        const recent = state.spec.recentSpecs.filter((n) => n !== name);
        recent.unshift(name);
        return {
          spec: { ...state.spec, recentSpecs: recent.slice(0, 10) },
        };
      });
    },

    /**
     * 设置加载状态
     */
    setLoading: (isLoading: boolean) => {
      set((state) => ({
        spec: { ...state.spec, isLoading },
      }));
    },

    /**
     * 设置错误
     */
    setError: (error: string | null) => {
      set((state) => ({
        spec: { ...state.spec, error },
      }));
    },

    /**
     * 更新 Spec 阶段
     */
    updatePhase: (phase: SpecPhase) => {
      set((state) => {
        if (!state.spec.currentSpec) return state;
        return {
          spec: {
            ...state.spec,
            currentSpec: {
              ...state.spec.currentSpec,
              phase,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },

    /**
     * 更新任务状态
     */
    updateTask: (task: SpecTask) => {
      set((state) => {
        if (!state.spec.currentSpec) return state;
        const tasks = state.spec.currentSpec.tasks.map((t) =>
          t.id === task.id ? task : t
        );
        return {
          spec: {
            ...state.spec,
            currentSpec: {
              ...state.spec.currentSpec,
              tasks,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },

    /**
     * 添加任务
     */
    addTask: (task: SpecTask) => {
      set((state) => {
        if (!state.spec.currentSpec) return state;
        return {
          spec: {
            ...state.spec,
            currentSpec: {
              ...state.spec.currentSpec,
              tasks: [...state.spec.currentSpec.tasks, task],
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
    },

    /**
     * 重置状态
     */
    reset: () => {
      set((state) => ({
        spec: { ...initialSpecState, actions: state.spec.actions },
      }));
    },

    /**
     * 从 SpecManager 同步状态
     */
    syncFromManager: (managerState: SpecManagerState) => {
      set((state) => ({
        spec: {
          ...state.spec,
          currentSpec: managerState.currentSpec,
          specPath: managerState.specPath,
          isActive: managerState.isActive,
          steeringContext: managerState.steeringContext,
          recentSpecs: managerState.recentSpecs,
        },
      }));
    },
  },
});
