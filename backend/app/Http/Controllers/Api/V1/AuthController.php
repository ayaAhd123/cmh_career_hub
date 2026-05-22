<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Models\User;

class AuthController extends Controller
{
    protected function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }

    public function login(Request $request)
    {
        $data = $request->only(['email', 'password']);
        $validator = Validator::make($data, [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('careerhub-api')->plainTextToken;
        return response()->json(['user' => $this->userPayload($user), 'token' => $token]);
    }

    public function logout(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            $token = $request->bearerToken();
            if ($token) {
                $user->currentAccessToken()?->delete();
            }
        }

        return response()->noContent();
    }

    public function me(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $data = $request->only(['name', 'email']);
                $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->full_name = $data['name'];
        $user->email = $data['email'];
        $user->save();

        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function changePassword(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $data = $request->only(['current', 'next']);
        $validator = Validator::make($data, [
            'current' => 'required|string',
            'next' => 'required|string|min:4',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!Hash::check($data['current'], $user->password)) {
            return response()->json(['message' => 'Current password incorrect'], 422);
        }

        $user->password = Hash::make($data['next']);
        $user->save();

        return response()->json(['message' => 'Password changed']);
    }
}
